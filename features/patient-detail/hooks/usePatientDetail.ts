import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTenant } from '@/hooks/useTenant';
import { PatientRepository } from '@/repositories';
import type { Patient, VisitHistory } from '@/entities';
import { mapPdfHistory, mapConsultationHistory } from '@/shared';

export function usePatientDetail(patientId?: string, initialPatient?: Patient | null) {
    const { doctorId } = useTenant();
    const [patient, setPatient] = useState<Patient | null>(initialPatient || null);
    const [history, setHistory] = useState<VisitHistory[]>([]);
    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState(!initialPatient);
    const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    const loadPageData = useCallback(async () => {
        if (!patientId) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        try {
            if (!doctorId) {
                Alert.alert('Error', 'Session expired. Please login again.');
                return;
            }

            if (controller.signal.aborted) return;

            const [details, historyData] = await Promise.all([
                PatientRepository.getPatientDetails(patientId),
                PatientRepository.getPatientHistory(patientId),
            ]);

            if (controller.signal.aborted) return;

            setPatient(details as Patient & { summary?: string });

            const consultations = Array.isArray(historyData)
                ? historyData
                : ((historyData as Record<string, unknown>)?.data as Array<Record<string, unknown>>) || [];

            const latestConsultation = consultations[0] as Record<string, unknown> | undefined;

            // Gather all history items
            const fromConsultations = mapConsultationHistory(consultations);
            let pdfHist: any[] = [];
            if (Array.isArray((historyData as any)?.pdf_history)) {
                pdfHist = (historyData as any).pdf_history;
            } else if (latestConsultation && Array.isArray(latestConsultation.pdf_history)) {
                pdfHist = latestConsultation.pdf_history;
            }
            const fromPdfs = mapPdfHistory(pdfHist);

            // Merge and deduplicate
            const combinedMap = new Map<string, VisitHistory>();

            // Add PDF items (distinguish by link to show separate versions if they exist)
            fromPdfs.forEach(item => {
                const key = item.link || item.id;
                combinedMap.set(key, item);
            });

            // Add/Overwrite with Consultation items
            fromConsultations.forEach(item => {
                const key = item.consultationID || item.id;
                const existing = combinedMap.get(key);
                if (existing) {
                    combinedMap.set(key, { ...item, link: existing.link || item.link });
                } else {
                    combinedMap.set(key, item);
                }
            });

            // Sort by consultationID or ID descending (likely latest first)
            const finalMergedHistory = Array.from(combinedMap.values()).sort((a, b) => {
                const valA = a.consultationID || a.id;
                const valB = b.consultationID || b.id;
                return valB.localeCompare(valA);
            });

            setHistory(finalMergedHistory);

            const detailsRecord = details as unknown as Record<string, unknown>;
            const rawSummary = detailsRecord?.summary || (latestConsultation?.summary as string | undefined);
            let latestSummary = '';

            if (rawSummary) {
                if (typeof rawSummary === 'string') {
                    latestSummary = rawSummary;
                } else if (typeof rawSummary === 'object' && rawSummary !== null && 'text' in rawSummary) {
                    latestSummary = (rawSummary as { text: string }).text;
                }
            }

            if (!latestSummary && latestConsultation) {
                const notes = latestConsultation.notes as Array<Record<string, unknown>> | undefined;
                if (notes?.[0]?.data) {
                    latestSummary = 'Clinical Summary Available (Notes recorded)';
                }
            }

            setSummary(latestSummary || '');
        } catch (error) {
            if ((error as Error)?.name === 'AbortError') return;
            if (__DEV__) console.error('Failed to load patient data:', error);
            Alert.alert('Error', 'Could not fetch patient details.');
        } finally {
            setIsLoading(false);
        }
    }, [doctorId, patientId]);

    useEffect(() => {
        loadPageData();
        return () => {
            abortRef.current?.abort();
        };
    }, [loadPageData]);

    const openEditProfile = useCallback(() => {
        setIsEditProfileVisible(true);
    }, []);

    const closeEditProfile = useCallback(() => {
        setIsEditProfileVisible(false);
    }, []);

    const handlePatientSave = useCallback((updated: Patient) => {
        setPatient(updated);
    }, []);

    return {
        patient,
        history,
        summary,
        isLoading,
        isEditProfileVisible,
        openEditProfile,
        closeEditProfile,
        handlePatientSave,
        loadPageData,
    };
}
