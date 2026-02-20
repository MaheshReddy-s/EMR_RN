import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import type { PdfFilterRenderOptions } from '@/components/consultation/pdf-filter-modal';
import type { ConsultationItem, Patient, User } from '@/entities';
import type { PdfSection } from '@/services/pdf-service';
import { PdfService } from '@/services/pdf-service';
import {
    buildAllPdfSections,
    DEFAULT_PDF_SECTION_IDS,
} from '@/features/consultation/utils/consultation-screen-utils';

interface UseConsultationPdfFlowParams {
    patient: Patient | null;
    user: User | null;
    followUpDate: Date | null;
    pdfSectionVisibility: Record<string, boolean>;
    pdfRenderOptions: PdfFilterRenderOptions;
    complaints: ConsultationItem[];
    diagnoses: ConsultationItem[];
    examinations: ConsultationItem[];
    investigations: ConsultationItem[];
    procedures: ConsultationItem[];
    prescriptions: ConsultationItem[];
    instructions: ConsultationItem[];
    notes: ConsultationItem[];
    setPreviewHtml: Dispatch<SetStateAction<string>>;
    setPreviewData: Dispatch<SetStateAction<any>>;
    setIsPrintPreviewVisible: Dispatch<SetStateAction<boolean>>;
    setPdfRenderOptions: Dispatch<SetStateAction<PdfFilterRenderOptions>>;
    setFollowUpDate: Dispatch<SetStateAction<Date | null>>;
    setIsFollowUpModalVisible: Dispatch<SetStateAction<boolean>>;
    stopTimer: () => void;
}

export function useConsultationPdfFlow({
    patient,
    user,
    followUpDate,
    pdfSectionVisibility,
    pdfRenderOptions,
    complaints,
    diagnoses,
    examinations,
    investigations,
    procedures,
    prescriptions,
    instructions,
    notes,
    setPreviewHtml,
    setPreviewData,
    setIsPrintPreviewVisible,
    setPdfRenderOptions,
    setFollowUpDate,
    setIsFollowUpModalVisible,
    stopTimer,
}: UseConsultationPdfFlowParams) {
    const preparePrintPreview = useCallback((
        enabledSectionIds?: string[],
        overrideFollowUpDate?: Date | null,
        overrideRenderOptions?: PdfFilterRenderOptions
    ) => {
        if (!patient || !user) {
            Alert.alert('Error', 'Patient or User data missing');
            return;
        }

        const resolvedFollowUpDate =
            overrideFollowUpDate !== undefined ? overrideFollowUpDate : followUpDate;
        const ids = enabledSectionIds && enabledSectionIds.length > 0
            ? enabledSectionIds
            : DEFAULT_PDF_SECTION_IDS.filter((id) => pdfSectionVisibility[id] !== false);
        const renderOptions = overrideRenderOptions || pdfRenderOptions;
        const allSections: PdfSection[] = buildAllPdfSections({
            complaints,
            diagnoses,
            examinations,
            investigations,
            procedures,
            prescriptions,
            instructions,
            notes,
        });
        const sections = allSections.filter((section) => ids.includes(section.id));

        const data = {
            patient,
            doctor: user,
            date: new Date().toLocaleDateString('en-GB'),
            sections,
            followUpDate: resolvedFollowUpDate
                ? resolvedFollowUpDate.toLocaleDateString('en-GB')
                : undefined,
        };

        setPreviewHtml(PdfService.generateHtml(data, renderOptions));
        setPreviewData({
            ...data,
            __renderOptions: renderOptions,
            __availableSections: allSections,
            __selectedSectionIds: ids,
        });
        setIsPrintPreviewVisible(true);
    }, [
        complaints,
        diagnoses,
        examinations,
        followUpDate,
        instructions,
        investigations,
        notes,
        patient,
        pdfRenderOptions,
        pdfSectionVisibility,
        prescriptions,
        procedures,
        setIsPrintPreviewVisible,
        setPreviewData,
        setPreviewHtml,
        user,
    ]);

    const handleNext = useCallback(() => {
        stopTimer();
        setIsFollowUpModalVisible(true);
    }, [setIsFollowUpModalVisible, stopTimer]);

    const handleFollowUpContinue = useCallback((date: Date) => {
        stopTimer();
        setFollowUpDate(date);
        setIsFollowUpModalVisible(false);
        preparePrintPreview(undefined, date);
    }, [preparePrintPreview, setFollowUpDate, setIsFollowUpModalVisible, stopTimer]);

    const handleFollowUpSkip = useCallback(() => {
        stopTimer();
        setFollowUpDate(null);
        setIsFollowUpModalVisible(false);
        preparePrintPreview(undefined, null);
    }, [preparePrintPreview, setFollowUpDate, setIsFollowUpModalVisible, stopTimer]);

    const generatePdfReport = useCallback(async (
        enabledSectionIds: string[],
        renderOptions: PdfFilterRenderOptions
    ) => {
        setPdfRenderOptions(renderOptions);
        preparePrintPreview(enabledSectionIds, undefined, renderOptions);
    }, [preparePrintPreview, setPdfRenderOptions]);

    return {
        preparePrintPreview,
        handleNext,
        handleFollowUpContinue,
        handleFollowUpSkip,
        generatePdfReport,
    };
}
