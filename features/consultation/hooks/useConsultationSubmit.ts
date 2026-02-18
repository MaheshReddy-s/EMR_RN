import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { ConsultationItem, ConsultationRecord, StrokeData } from '@/entities';
import type { ConsultationState } from '@/hooks/useConsultation';
import type { User } from '@/entities';
import type { FollowupInfoSelection } from '@/components/consultation/followup-info-modal';
import { AppointmentRepository } from '@/repositories';
import { PdfService } from '@/services/pdf-service';
import { OfflinePdfUploadQueue } from '@/services/offline-pdf-upload-queue';
import { APP_ERROR_CODES, AppError } from '@/shared/lib/app-error';
import { normalizeApiError } from '@/shared/lib/error-normalizer';

interface UseConsultationSubmitParams {
    consultation: ConsultationState;
    user: User | null;
    patientId: string;
    followUpDate: Date | null;
    appointmentId?: string | null;
    appointmentTimestamp?: number | null;
    previewData: unknown;
    navigateOnSuccess: () => void;
    repositoryRef: {
        submitConsultation: (record: ConsultationRecord) => Promise<Record<string, unknown>>;
        uploadConsultationPdf: (payload: {
            consultationId: string;
            patientId: string;
            appointmentId?: string;
            pdfUri: string;
            fileName?: string;
        }) => Promise<Record<string, unknown>>;
        clearDraft: () => Promise<any>;
    };
}

function toUnixSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

function getStartOfDayUnix(date: Date): number {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor(start.getTime() / 1000);
}

async function resolveAppointmentContext(params: {
    patientId: string;
    appointmentId?: string | null;
    appointmentTimestamp?: number | null;
}): Promise<{ appointmentId: string; aptDate: number }> {
    const fallbackAptDate =
        typeof params.appointmentTimestamp === 'number' && Number.isFinite(params.appointmentTimestamp)
            ? params.appointmentTimestamp
            : toUnixSeconds(new Date());

    const existingAppointmentId = params.appointmentId?.trim();
    if (existingAppointmentId) {
        return {
            appointmentId: existingAppointmentId,
            aptDate: fallbackAptDate,
        };
    }

    const todayStartUnix = getStartOfDayUnix(new Date());
    const todaysAppointments = await AppointmentRepository.getAppointments(todayStartUnix, true);

    const candidates = todaysAppointments
        .filter((appointment) =>
            appointment.patient_id === params.patientId ||
            appointment.patient?._id === params.patientId
        )
        .sort((a, b) => (b.apt_timestamp || 0) - (a.apt_timestamp || 0));

    const selected = candidates.find((appointment) => !appointment.is_consulted) || candidates[0];
    if (selected?._id) {
        return {
            appointmentId: selected._id,
            aptDate: selected.apt_timestamp || fallbackAptDate,
        };
    }

    const created = await AppointmentRepository.createAppointment({
        patient_id: params.patientId,
        appointment_date: fallbackAptDate,
        appointment_type: 'walkin',
        reason_to_visit: 'Consultation',
        appointment_source: 'walkin',
    });

    if (!created?._id) {
        throw new AppError({
            code: APP_ERROR_CODES.UNKNOWN,
            message: 'Unable to resolve appointment for consultation submission.',
            isRetryable: false,
        });
    }

    return {
        appointmentId: created._id,
        aptDate: created.apt_timestamp || fallbackAptDate,
    };
}

function normalizeDrawings(drawings?: StrokeData[]): StrokeData[] {
    if (!Array.isArray(drawings) || drawings.length === 0) return [];
    return drawings.map((stroke) => ({
        svg: stroke.svg,
        color: stroke.color,
        width: stroke.width,
        blendMode: stroke.blendMode,
    }));
}

function mapSectionItems(items: ConsultationItem[]) {
    return items
        .filter((item) => (item.name && item.name.trim().length > 0) || (item.drawings?.length ?? 0) > 0)
        .map((item) => ({
            name: item.name?.trim() || '',
            notes: item.notes,
            genericName: item.genericName,
            drawings: normalizeDrawings(item.drawings),
            height: item.height,
        }));
}

function extractConsultationId(response: Record<string, unknown>): string | null {
    const nested = typeof response.data === 'object' && response.data !== null
        ? response.data as Record<string, unknown>
        : null;

    const candidates: unknown[] = [
        response._id,
        response.id,
        nested?._id,
        nested?.id,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate;
        }
        if (candidate && typeof candidate === 'object') {
            const record = candidate as Record<string, unknown>;
            const oid = record.$oid;
            if (typeof oid === 'string' && oid.trim().length > 0) {
                return oid;
            }
        }
    }

    return null;
}

export function useConsultationSubmit({
    consultation,
    user,
    patientId,
    followUpDate,
    appointmentId,
    appointmentTimestamp,
    previewData,
    navigateOnSuccess,
    repositoryRef,
}: UseConsultationSubmitParams) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = useCallback(async (_selection?: FollowupInfoSelection) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const {
                complaints,
                diagnosis,
                examination,
                investigation,
                procedure,
                prescriptions,
                instruction,
                notes,
                sessionStartTime,
            } = consultation;

            const doctorId = user?.id;
            if (!doctorId) {
                throw new AppError({
                    code: APP_ERROR_CODES.INVALID_SESSION,
                    message: 'Missing doctor identity in session.',
                    isRetryable: false,
                });
            }

            const appointmentContext = await resolveAppointmentContext({
                patientId,
                appointmentId,
                appointmentTimestamp,
            });

            const aptDate = appointmentContext.aptDate;
            const startTimestamp = Math.floor((sessionStartTime || Date.now()) / 1000);

            const record: ConsultationRecord = {
                doctor_id: doctorId,
                patient_id: patientId,
                appointment_id: appointmentContext.appointmentId,
                apt_date: aptDate,
                start_timestamp: startTimestamp,
                next_apt_reason: _selection?.note?.trim() || undefined,
                complaints: mapSectionItems(complaints),
                diagnosis: mapSectionItems(diagnosis),
                examination: mapSectionItems(examination),
                investigation: mapSectionItems(investigation),
                procedure: mapSectionItems(procedure),
                prescriptions: prescriptions.map((p) => ({
                    brand_name: p.name,
                    generic_name: p.genericName,
                    dosage: p.dosage || '',
                    duration: p.duration || '',
                    drawings: normalizeDrawings(p.drawings),
                    variants: [{
                        timings: p.timings || 'M-O-E-N',
                        dosage: p.dosage || '',
                        duration: p.duration || '5 Days',
                        type: p.type || 'Tablet',
                        instructions: p.instructions || '',
                    }],
                })),
                instruction: mapSectionItems(instruction),
                notes: mapSectionItems(notes),
                follow_up_date: followUpDate ? toUnixSeconds(followUpDate) : undefined,
                submittedAt: new Date().toISOString(),
            };

            const response = await repositoryRef.submitConsultation(record);
            const consultationId = extractConsultationId(response);
            if (!consultationId) {
                throw new AppError({
                    code: APP_ERROR_CODES.UNKNOWN,
                    message: 'Consultation saved but no consultation ID was returned.',
                    isRetryable: false,
                });
            }

            if (Platform.OS === 'web') {
                await repositoryRef.clearDraft();
                Alert.alert(
                    'Consultation Saved',
                    'The consultation record has been saved successfully.',
                    [{ text: 'OK', onPress: navigateOnSuccess }]
                );
                return;
            }

            if (!previewData) {
                throw new AppError({
                    code: APP_ERROR_CODES.UNKNOWN,
                    message: 'Missing consultation preview data for PDF generation.',
                    isRetryable: false,
                });
            }

            const pdfUri = await PdfService.createEncryptedPdf(previewData as any);
            if (!pdfUri) {
                throw new AppError({
                    code: APP_ERROR_CODES.UNKNOWN,
                    message: 'Failed to generate consultation PDF.',
                    isRetryable: true,
                });
            }

            try {
                await repositoryRef.uploadConsultationPdf({
                    consultationId,
                    patientId,
                    appointmentId: appointmentContext.appointmentId,
                    pdfUri,
                    fileName: 'consultation.pdf',
                });
            } catch (uploadError) {
                void normalizeApiError(uploadError);

                await OfflinePdfUploadQueue.enqueue({
                    consultationId,
                    patientId,
                    doctorId,
                    appointmentId: appointmentContext.appointmentId,
                    pdfUri,
                    fileName: 'consultation.pdf',
                });

                await repositoryRef.clearDraft();
                Alert.alert(
                    'Consultation Saved',
                    'Consultation was saved. PDF upload is queued and will retry automatically.',
                    [{ text: 'OK', onPress: navigateOnSuccess }]
                );
                return;
            }

            await repositoryRef.clearDraft();

            Alert.alert(
                'Consultation Saved',
                'The consultation record has been saved successfully.',
                [{ text: 'OK', onPress: navigateOnSuccess }]
            );
        } catch (error) {
            const normalizedError = normalizeApiError(error);
            Alert.alert('Error', normalizedError.message || 'Failed to save consultation record');
        } finally {
            setIsSubmitting(false);
        }
    }, [
        appointmentId,
        appointmentTimestamp,
        consultation,
        followUpDate,
        isSubmitting,
        navigateOnSuccess,
        patientId,
        previewData,
        repositoryRef,
        user?.id,
    ]);

    return {
        submit,
        isSubmitting,
    };
}
