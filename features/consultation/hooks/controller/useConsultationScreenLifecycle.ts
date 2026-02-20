import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PdfFilterRenderOptions } from '@/components/consultation/pdf-filter-modal';
import type { ConsultationState } from '@/entities/consultation/types';
import { API_ENDPOINTS } from '@/constants/endpoints';
import { SECTION_KEYS } from '@/hooks/useConsultation';
import { api } from '@/lib/api-client';
import { DraftService } from '@/services/draft-service';
import {
    createDefaultPdfSectionVisibility,
    SECTION_SETTINGS_KEYS,
} from '@/features/consultation/utils/consultation-screen-utils';
import { mapToConsultationState } from '@/shared/lib/consultation-mapper';

interface UseConsultationScreenLifecycleParams {
    patientId: string;
    appointmentId?: string;
    clinicId?: string | null;
    doctorId?: string | null;
    consultation: ConsultationState;
    restoreDraft: (draft: Partial<ConsultationState>) => void;
    resetSession: () => void;
    startTimer: () => void;
    stopTimer: () => void;
    isLoadingPatient: boolean;
    latestConsultation: Record<string, unknown> | null;
    setPenThickness: Dispatch<SetStateAction<number>>;
    setPdfSectionVisibility: Dispatch<SetStateAction<Record<string, boolean>>>;
    setPdfRenderOptions: Dispatch<SetStateAction<PdfFilterRenderOptions>>;
}

export function useConsultationScreenLifecycle({
    patientId,
    appointmentId,
    clinicId,
    doctorId,
    consultation,
    restoreDraft,
    resetSession,
    startTimer,
    stopTimer,
    isLoadingPatient,
    latestConsultation,
    setPenThickness,
    setPdfSectionVisibility,
    setPdfRenderOptions,
}: UseConsultationScreenLifecycleParams) {
    const hasInitializedRef = useRef(false);
    const consultationRef = useRef(consultation);
    consultationRef.current = consultation;
    const consultationSessionKey = `${patientId}:${appointmentId || 'walkin'}`;

    // Allow prefill flow to run again when the route switches to a different patient.
    useEffect(() => {
        hasInitializedRef.current = false;
    }, [patientId]);

    useEffect(() => {
        resetSession();
        startTimer();

        return () => {
            stopTimer();
        };
    }, [consultationSessionKey, resetSession, startTimer, stopTimer]);

    useEffect(() => {
        let isCancelled = false;

        const loadConsultationSettings = async () => {
            if (!clinicId || !doctorId) return;

            try {
                const settings: any = await api.get(API_ENDPOINTS.SETTINGS.GET(clinicId, doctorId));
                const value = Number(settings?.pencil_thickness);
                const normalized = Number.isFinite(value)
                    ? Math.max(1, Math.min(50, value))
                    : 1.5;

                if (isCancelled) return;

                setPenThickness(normalized);

                const nextVisibility = createDefaultPdfSectionVisibility();
                for (const section of SECTION_SETTINGS_KEYS) {
                    nextVisibility[section.id] = settings?.[section.key] !== false;
                }
                setPdfSectionVisibility(nextVisibility);

                const nextRenderOptions: PdfFilterRenderOptions = {
                    includeDoctorDetails: settings?.doctor_details_in_consultation ?? true,
                    includePatientDetails: settings?.patient_details_in_consultation ?? true,
                    includeHeaderSection: settings?.letterpad_header ?? true,
                    includeFooterSection: settings?.letterpad_footer ?? false,
                };
                setPdfRenderOptions(nextRenderOptions);
            } catch (error) {
                if (__DEV__) {
                    console.warn('[Consultation] Failed to load consultation settings:', error);
                }
            }
        };

        void loadConsultationSettings();

        return () => {
            isCancelled = true;
        };
    }, [clinicId, doctorId, setPdfRenderOptions, setPdfSectionVisibility, setPenThickness]);

    useEffect(() => {
        if (isLoadingPatient || !latestConsultation || !patientId || hasInitializedRef.current) return;
        hasInitializedRef.current = true;
        let cancelled = false;

        void DraftService.loadDraft(patientId).then((draft) => {
            if (cancelled || draft) return;

            const currentConsultation = consultationRef.current;
            const isEmpty = SECTION_KEYS.every((key) => (currentConsultation[key] as any[]).length === 0);
            if (!isEmpty) return;

            if (__DEV__) console.log('[Consultation] Pre-filling from latest history');
            const historyState = mapToConsultationState(latestConsultation);
            if (Object.keys(historyState).length > 0) {
                restoreDraft(historyState);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isLoadingPatient, latestConsultation, patientId, restoreDraft]);
}
