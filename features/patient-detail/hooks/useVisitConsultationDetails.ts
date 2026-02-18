import { useCallback, useRef, useState } from 'react';
import type { StrokeData, VisitHistory } from '@/entities';
import { ConsultationRepository } from '@/repositories';

import { buildConsultationSections, ConsultationDetailRow, ConsultationDetailSection } from '@/shared/lib/consultation-mapper';

export type { ConsultationDetailRow, ConsultationDetailSection };

// Removed duplicated helper functions as they are now in shared/lib/consultation-mapper.ts


export function useVisitConsultationDetails() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedVisit, setSelectedVisit] = useState<VisitHistory | null>(null);
    const [sections, setSections] = useState<ConsultationDetailSection[]>([]);
    const requestIdRef = useRef(0);

    const closeVisitDetails = useCallback(() => {
        requestIdRef.current += 1;
        setIsVisible(false);
        setIsLoading(false);
        setErrorMessage(null);
        setSelectedVisit(null);
        setSections([]);
    }, []);

    const openVisitDetails = useCallback(async (visit: VisitHistory) => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        setSelectedVisit(visit);
        setSections([]);
        setErrorMessage(null);
        setIsLoading(true);
        setIsVisible(true);

        if (!visit.consultationID) {
            if (requestIdRef.current === requestId) {
                setErrorMessage('Consultation reference is missing for this visit.');
                setIsLoading(false);
            }
            return;
        }

        try {
            const payload = await ConsultationRepository.getConsultationDetails(visit.consultationID);
            if (requestIdRef.current !== requestId) return;

            const parsedSections = buildConsultationSections(payload);
            setSections(parsedSections);

            if (parsedSections.length === 0) {
                setErrorMessage('No consultation details available for this visit.');
            }
        } catch (error) {
            if (requestIdRef.current !== requestId) return;
            if (__DEV__) console.error('Failed to fetch consultation details:', error);
            setErrorMessage('Could not load consultation details.');
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, []);

    return {
        isVisible,
        isLoading,
        errorMessage,
        selectedVisit,
        sections,
        openVisitDetails,
        closeVisitDetails,
    };
}
