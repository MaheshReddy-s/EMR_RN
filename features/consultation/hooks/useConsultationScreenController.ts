import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView } from 'react-native';
import type { PdfFilterRenderOptions } from '@/components/consultation/pdf-filter-modal';
import type { ConsultationScreenContentProps } from '@/features/consultation/components/ConsultationScreenContent';
import { useConsultationDraft } from '@/features/consultation/hooks/useConsultationDraft';
import { useConsultationPatientData } from '@/features/consultation/hooks/useConsultationPatientData';
import {
    ConsultationSuggestion,
    useConsultationSuggestions,
} from '@/features/consultation/hooks/useConsultationSuggestions';
import { useConsultationSubmit } from '@/features/consultation/hooks/useConsultationSubmit';
import {
    createDefaultPdfSectionVisibility,
    DEFAULT_PDF_RENDER_OPTIONS,
} from '@/features/consultation/utils/consultation-screen-utils';
import { ConsultationItem, StrokeData } from '@/entities';
import { useConsultation, TabType, SECTION_KEYS } from '@/hooks/useConsultation';
import { useTenant } from '@/hooks/useTenant';
import { ConsultationRepository } from '@/repositories';
import { DraftService } from '@/services/draft-service';
import type { EditingRowRef } from '@/features/consultation/hooks/controller/useConsultationPropertyActions';
import { useConsultationPdfFlow } from '@/features/consultation/hooks/controller/useConsultationPdfFlow';
import { useConsultationPropertyActions } from '@/features/consultation/hooks/controller/useConsultationPropertyActions';
import { useConsultationScreenLifecycle } from '@/features/consultation/hooks/controller/useConsultationScreenLifecycle';

interface UseConsultationScreenControllerParams {
    patientId: string;
    appointmentId?: string;
    appointmentTimestamp: number | null;
}

export function useConsultationScreenController({
    patientId,
    appointmentId,
    appointmentTimestamp,
}: UseConsultationScreenControllerParams) {
    const router = useRouter();
    const { clinicId, doctorId } = useTenant();
    const isWeb = Platform.OS === 'web';

    const [penThickness, setPenThickness] = useState(1.5);
    const scrollViewRef = useRef<ScrollView>(null);

    const {
        state: consultation,
        addItem,
        removeItem,
        updateItem,
        setStrokes,
        clearSection,
        clearItemDrawings,
        restoreDraft,
        startTimer,
        stopTimer,
        resetSession,
    } = useConsultation();

    const {
        complaints,
        diagnosis: diagnoses,
        examination: examinations,
        investigation: investigations,
        procedure: procedures,
        prescriptions,
        instruction: instructions,
        notes,
        elapsedTime,
    } = consultation;

    const [currentInputStrokes, setCurrentInputStrokes] = useState<StrokeData[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('instruction');
    const [writingText, setWritingText] = useState('');
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editModalTitle, setEditModalTitle] = useState('');
    const [editModalText, setEditModalText] = useState('');
    const [editingItem, setEditingItem] = useState<EditingRowRef | null>(null);
    const [isPrescriptionModalVisible, setIsPrescriptionModalVisible] = useState(false);
    const [isPrescriptionEditModalVisible, setIsPrescriptionEditModalVisible] = useState(false);
    const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [isPhotosVisible, setIsPhotosVisible] = useState(false);
    const [isLabsVisible, setIsLabsVisible] = useState(false);
    const [currentPrescriptionData, setCurrentPrescriptionData] = useState<any | null>(null);
    const [isFollowUpModalVisible, setIsFollowUpModalVisible] = useState(false);
    const [isPrintPreviewVisible, setIsPrintPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewData, setPreviewData] = useState<any>(null);
    const [pdfSectionVisibility, setPdfSectionVisibility] = useState<Record<string, boolean>>(
        createDefaultPdfSectionVisibility
    );
    const [pdfRenderOptions, setPdfRenderOptions] =
        useState<PdfFilterRenderOptions>(DEFAULT_PDF_RENDER_OPTIONS);
    const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
    const [editingPropertySuggestion, setEditingPropertySuggestion] =
        useState<ConsultationSuggestion | null>(null);

    const {
        patient,
        setPatient,
        isLoadingPatient,
        patientError,
        user,
        patientPhotos,
        patientLabs,
        isLoadingAssets,
        handleCapturePhoto,
        latestConsultation,
    } = useConsultationPatientData({
        patientId,
        isPhotosVisible,
        isLabsVisible,
    });

    useConsultationDraft({ patientId, consultation, restoreDraft });

    useConsultationScreenLifecycle({
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
        latestConsultation: latestConsultation || null,
        setPenThickness,
        setPdfSectionVisibility,
        setPdfRenderOptions,
    });

    const { suggestions, isLoadingSuggestions, onSuggestionSelect, refreshSuggestions } =
        useConsultationSuggestions({
            activeTab,
            writingText,
            consultation,
            addItem,
            onOpenPrescription: (data) => {
                setCurrentPrescriptionData(data);
                setIsPrescriptionModalVisible(true);
            },
        });

    const { submit } = useConsultationSubmit({
        consultation,
        user,
        patientId,
        followUpDate,
        appointmentId: appointmentId || null,
        appointmentTimestamp: Number.isFinite(appointmentTimestamp) ? appointmentTimestamp : null,
        previewData,
        navigateOnSuccess: () => router.replace('/(app)/dashboard'),
        repositoryRef: {
            submitConsultation: ConsultationRepository.submitConsultation,
            uploadConsultationPdf: ConsultationRepository.uploadConsultationPdf,
            clearDraft: DraftService.clearDraft,
        },
    });

    const {
        handleNext,
        handleFollowUpContinue,
        handleFollowUpSkip,
        generatePdfReport,
    } = useConsultationPdfFlow({
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
    });

    const {
        addToCurrentSection,
        handleEditRow,
        handleAddNewProperty,
        handleEditProperty,
        handleDeleteProperty,
        handleEditCurrentInput,
        saveEditModal,
        savePrescriptionEdit,
        handleClearInput,
    } = useConsultationPropertyActions({
        activeTab,
        writingText,
        currentInputStrokes,
        onSuggestionSelect,
        refreshSuggestions,
        editingItem,
        editModalTitle,
        editModalText,
        editingPropertySuggestion,
        setEditingItem,
        setCurrentPrescriptionData,
        setIsPrescriptionEditModalVisible,
        setWritingText,
        setCurrentInputStrokes,
        setEditModalTitle,
        setEditModalText,
        setIsEditModalVisible,
        setEditingPropertySuggestion,
        updateItem,
        addItem,
    });

    const handleStrokesChange = useCallback((section: TabType, id: string, strokes: StrokeData[]) => {
        setStrokes(section, id, strokes);
    }, [setStrokes]);

    const isConsultationInProgress = useCallback(() => {
        const hasSectionItems = SECTION_KEYS.some((key) => {
            const items = consultation[key] as ConsultationItem[];
            return Array.isArray(items) && items.length > 0;
        });

        return hasSectionItems || writingText.trim().length > 0 || currentInputStrokes.length > 0;
    }, [consultation, writingText, currentInputStrokes]);

    const handleBack = useCallback(() => {
        if (!isConsultationInProgress()) {
            stopTimer();
            router.back();
            return;
        }

        Alert.alert(
            'Leave Consultation?',
            'Consultation is in progress. If you go back now, unsaved changes may be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => {
                        stopTimer();
                        router.back();
                    },
                },
            ]
        );
    }, [isConsultationInProgress, router, stopTimer]);

    const handleExpandRow = useCallback((section: TabType, id: string) => {
        const item = (consultation[section] as ConsultationItem[]).find((entry) => entry.id === id);
        if (item) updateItem(section, id, { height: (item.height || 60) + 40 });
    }, [consultation, updateItem]);

    const handleClearAll = useCallback((_section: TabType) => {
        Alert.alert('Clear All', 'Are you sure you want to clear all the data?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes',
                style: 'destructive',
                onPress: () => {
                    SECTION_KEYS.forEach((key) => clearSection(key));
                    setWritingText('');
                    setCurrentInputStrokes([]);
                },
            },
        ]);
    }, [clearSection]);

    const onErrorBack = useCallback(() => {
        stopTimer();
        router.replace('/(app)/dashboard');
    }, [router, stopTimer]);

    const contentProps: ConsultationScreenContentProps = useMemo(() => ({
        isWeb,
        patientId,
        patient,
        user,
        isLoadingPatient,
        patientError,
        onErrorBack,
        onBack: handleBack,
        onNext: handleNext,
        activeTab,
        onTabChange: setActiveTab,
        suggestions,
        isLoadingSuggestions,
        onSuggestionSelect,
        writingText,
        onWritingTextChange: setWritingText,
        onEditCurrentInput: handleEditCurrentInput,
        onAddToCurrentSection: addToCurrentSection,
        currentInputStrokes,
        onCurrentInputStrokesChange: setCurrentInputStrokes,
        onClearInput: handleClearInput,
        onClearAll: handleClearAll,
        elapsedTime,
        scrollViewRef,
        penThickness,
        complaints,
        diagnoses,
        examinations,
        investigations,
        procedures,
        prescriptions,
        instructions,
        notes,
        clearSection,
        removeItem,
        onClearRow: clearItemDrawings,
        onExpandRow: handleExpandRow,
        onStrokesChange: handleStrokesChange,
        onEditRow: handleEditRow,
        addItem,
        isPrescriptionModalVisible,
        setIsPrescriptionModalVisible,
        currentPrescriptionData,
        isFollowUpModalVisible,
        setIsFollowUpModalVisible,
        onFollowUpSkip: handleFollowUpSkip,
        onFollowUpContinue: handleFollowUpContinue,
        isPrintPreviewVisible,
        setIsPrintPreviewVisible,
        onSaveConsultation: submit,
        onGeneratePdfReport: generatePdfReport,
        previewHtml,
        previewData,
        isHistoryVisible,
        setIsHistoryVisible,
        isPhotosVisible,
        setIsPhotosVisible,
        isLabsVisible,
        setIsLabsVisible,
        patientPhotos,
        patientLabs,
        isLoadingAssets,
        onCapturePhoto: handleCapturePhoto,
        isEditProfileVisible,
        setIsEditProfileVisible,
        isEditModalVisible,
        setIsEditModalVisible,
        editModalTitle,
        editModalText,
        setEditModalText,
        onSaveEditModal: saveEditModal,
        isPrescriptionEditModalVisible,
        setIsPrescriptionEditModalVisible,
        onSavePrescriptionEdit: savePrescriptionEdit,
        onAddNewProperty: handleAddNewProperty,
        onEditProperty: handleEditProperty,
        onDeleteProperty: handleDeleteProperty,
    }), [
        activeTab,
        addItem,
        addToCurrentSection,
        clearItemDrawings,
        clearSection,
        complaints,
        currentInputStrokes,
        currentPrescriptionData,
        diagnoses,
        editModalText,
        editModalTitle,
        elapsedTime,
        examinations,
        generatePdfReport,
        handleAddNewProperty,
        handleBack,
        handleCapturePhoto,
        handleClearAll,
        handleClearInput,
        handleDeleteProperty,
        handleEditCurrentInput,
        handleEditProperty,
        handleEditRow,
        handleExpandRow,
        handleFollowUpContinue,
        handleFollowUpSkip,
        handleNext,
        handleStrokesChange,
        instructions,
        investigations,
        isEditModalVisible,
        isEditProfileVisible,
        isFollowUpModalVisible,
        isHistoryVisible,
        isLabsVisible,
        isLoadingAssets,
        isLoadingPatient,
        isLoadingSuggestions,
        isPhotosVisible,
        isPrescriptionEditModalVisible,
        isPrescriptionModalVisible,
        isPrintPreviewVisible,
        isWeb,
        notes,
        onErrorBack,
        onSuggestionSelect,
        patient,
        patientError,
        patientId,
        patientLabs,
        patientPhotos,
        penThickness,
        prescriptions,
        previewData,
        previewHtml,
        procedures,
        removeItem,
        saveEditModal,
        savePrescriptionEdit,
        submit,
        suggestions,
        user,
        writingText,
    ]);

    return {
        contentProps,
        patient,
        setPatient,
        isEditProfileVisible,
        setIsEditProfileVisible,
    };
}
