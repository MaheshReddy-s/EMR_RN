import { useEffect } from 'react';
import type { ConsultationState } from '@/hooks/useConsultation';
import { ConsultationRepository } from '@/repositories';
import type { ConsultationRecord } from '@/entities/consultation/types';

interface UseConsultationPreFillParams {
    patientId: string;
    consultation: ConsultationState;
    restoreDraft: (draft: Partial<ConsultationState>) => void;
}

export function useConsultationPreFill({
    patientId,
    consultation,
    restoreDraft,
}: UseConsultationPreFillParams) {
    useEffect(() => {
        if (!patientId) return;

        // Check if consultation is empty (pristine)
        const isEmpty =
            consultation.complaints.length === 0 &&
            consultation.diagnosis.length === 0 &&
            consultation.examination.length === 0 &&
            consultation.investigation.length === 0 &&
            consultation.procedure.length === 0 &&
            consultation.prescriptions.length === 0 &&
            consultation.instruction.length === 0 &&
            consultation.notes.length === 0;

        if (!isEmpty) return;

        let isMounted = true;

        const fetchLatest = async () => {
            try {
                // Fetch the most recent consultation
                const rawData = await ConsultationRepository.getRecentConsultation(patientId);
                if (!isMounted || !rawData) return;

                // If the API returns an array, pick the first item, otherwise use the object
                const latest = (Array.isArray(rawData) ? rawData[0] : rawData) as any;
                if (!latest) return;

                // Map the backend record to frontend state
                // Note: The backend returns snake_case, frontend uses camelCase or direct mapping depending on section
                // But ConsultationItem expects: id, name, etc.
                // The API payload format for items is: { name: string, generic_name?: string, ... }
                // We need to map it to ConsultationItem: { id: string, name: string, ... }

                const mapSection = (items: any[]): any[] => {
                    return (items || []).map((item, index) => ({
                        id: item.id || item._id || `${Date.now()}-${index}-${Math.random()}`,
                        name: item.name || item.property_value || '', // Backend might send property_value or name
                        genericName: item.generic_name,
                        dosage: item.dosage,
                        duration: item.duration,
                        drawings: item.drawings,
                        notes: item.notes,
                    }));
                };

                // Prescriptions might have a different structure in record vs state
                // In ConsultationRecord: prescriptions: PrescriptionPayload[]
                // In ConsultationState: prescriptions: ConsultationItem[]
                const mapPrescriptions = (items: any[]): any[] => {
                    return (items || []).map((item, index) => {
                        // If it's a rich prescription payload, flattening it for the list view
                        // The list view expects 'name' (brand name), 'dosage' (timings), 'duration'
                        const variant = item.variants?.[0] || {};
                        return {
                            id: item.id || item._id || `${Date.now()}-rx-${index}`,
                            name: item.brand_name || item.name || '',
                            genericName: item.generic_name,
                            dosage: variant.timings || item.dosage || '',
                            duration: variant.duration || item.duration || '',
                            drawings: item.drawings,
                        };
                    });
                };

                const newState: Partial<ConsultationState> = {
                    // Start mainly with instructions as requested, but we can do all.
                    // The user said "latest consultation instructions and all"
                    instruction: mapSection(latest.instruction),
                    // Optional: other sections if deemed "and all" implies everything
                    // Usually copying everything is aggressive. 
                    // Let's copy Instruction, Diagnosis, and maybe Notes?
                    // User said "instructions and all", likely implying full carry-over.
                    complaints: mapSection(latest.complaints),
                    diagnosis: mapSection(latest.diagnosis),
                    examination: mapSection(latest.examination),
                    investigation: mapSection(latest.investigation),
                    procedure: mapSection(latest.procedure),
                    prescriptions: mapPrescriptions(latest.prescriptions),
                    notes: mapSection(latest.notes),
                };

                // Remove empty sections to avoid overwriting with empty arrays if unnecessary, 
                // though restoreDraft should handle merge or replacement.
                // reduce to only non-empty arrays?
                // actually restoreDraft replaces the section in the reducer.

                restoreDraft(newState);

            } catch (error) {
                // Squelch error - if no history, just start fresh
                if (__DEV__) console.log('[useConsultationPreFill] No recent history or error fetching', error);
            }
        };

        fetchLatest();

        return () => { isMounted = false; };

    }, [patientId]); // Run once when patientId changes
}
