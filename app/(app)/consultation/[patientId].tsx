import React, { useCallback, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EditProfileModal } from '@/components/patient/EditProfileModal';
import type { PdfFilterRenderOptions } from '@/components/consultation/pdf-filter-modal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ConsultationScreenContent } from '@/features/consultation/components/ConsultationScreenContent';
import { useConsultationDraft } from '@/features/consultation/hooks/useConsultationDraft';
import { useConsultationPatientData } from '@/features/consultation/hooks/useConsultationPatientData';
import { ConsultationSuggestion, useConsultationSuggestions } from '@/features/consultation/hooks/useConsultationSuggestions';
import { useConsultationSubmit } from '@/features/consultation/hooks/useConsultationSubmit';
import { ConsultationItem, StrokeData } from '@/entities';
import { useConsultation, TabType, SECTION_KEYS } from '@/hooks/useConsultation';
import { useTenant } from '@/hooks/useTenant';
import { API_ENDPOINTS } from '@/constants/endpoints';
import { ConsultationRepository, MasterDataRepository } from '@/repositories';
import { DraftService } from '@/services/draft-service';
import { PdfService, PdfSection } from '@/services/pdf-service';
import { mapToConsultationState } from '@/shared/lib/consultation-mapper';
import type { PrescriptionData } from '@/entities/consultation/types';
import { api } from '@/lib/api-client';

const DEFAULT_PDF_SECTION_IDS = ['complaints', 'diagnosis', 'examination', 'investigation', 'procedure', 'prescriptions', 'instruction', 'notes'];
const DEFAULT_PDF_RENDER_OPTIONS: PdfFilterRenderOptions = {
    includePatientDetails: true,
    includeDoctorDetails: true,
    includeHeaderSection: true,
    includeFooterSection: true,
};
const SECTION_LABELS: Record<TabType, string> = {
    complaints: 'Complaints',
    diagnosis: 'Diagnosis',
    examination: 'Examination',
    investigation: 'Investigation',
    procedure: 'Procedure',
    prescriptions: 'Prescriptions',
    instruction: 'Instruction',
    notes: 'Notes',
};

const SECTION_SETTINGS_KEYS: Array<{ id: string; key: string }> = [
    { id: 'complaints', key: 'complaints' },
    { id: 'diagnosis', key: 'diagnosis' },
    { id: 'examination', key: 'examination' },
    { id: 'investigation', key: 'investigation' },
    { id: 'procedure', key: 'procedure' },
    { id: 'prescriptions', key: 'prescriptions' },
    { id: 'instruction', key: 'instruction' },
    { id: 'notes', key: 'notes' },
];

function firstParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

export default function ConsultationScreen() {
    const params = useLocalSearchParams<{
        patientId: string;
        appointmentId?: string;
        aptTimestamp?: string;
    }>();
    const patientId = firstParam(params.patientId) as string;
    const appointmentId = firstParam(params.appointmentId);
    const aptTimestampRaw = firstParam(params.aptTimestamp);
    const appointmentTimestamp = aptTimestampRaw ? Number(aptTimestampRaw) : null;
    const router = useRouter();
    const { clinicId, doctorId } = useTenant();
    const isWeb = Platform.OS === 'web';
    const [penThickness, setPenThickness] = useState(1.5);
    const scrollViewRef = useRef<ScrollView>(null);
    const {
        state: consultation, addItem, removeItem, updateItem,
        setStrokes, clearSection, clearItemDrawings, restoreDraft,
        startTimer, stopTimer, resetSession,
    } = useConsultation();
    const { complaints, diagnosis: diagnoses, examination: examinations, investigation: investigations, procedure: procedures, prescriptions, instruction: instructions, notes, elapsedTime } = consultation;
    const [currentInputStrokes, setCurrentInputStrokes] = useState<StrokeData[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('instruction');
    const [writingText, setWritingText] = useState('');
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editModalTitle, setEditModalTitle] = useState('');
    const [editModalText, setEditModalText] = useState('');
    const [editingItem, setEditingItem] = useState<{ section: TabType; id: string } | null>(null);
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
        () => DEFAULT_PDF_SECTION_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {})
    );
    const [pdfRenderOptions, setPdfRenderOptions] = useState<PdfFilterRenderOptions>(DEFAULT_PDF_RENDER_OPTIONS);
    const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
    const [editingPropertySuggestion, setEditingPropertySuggestion] = useState<ConsultationSuggestion | null>(null);

    const {
        patient, setPatient, isLoadingPatient, patientError, user,
        patientPhotos, patientLabs, isLoadingAssets, handleCapturePhoto,
        latestConsultation
    } = useConsultationPatientData({
        patientId,
        isPhotosVisible,
        isLabsVisible,
    });

    useConsultationDraft({ patientId, consultation, restoreDraft });

    const hasInitializedRef = useRef(false);
    const consultationSessionKey = `${patientId}:${appointmentId || 'walkin'}`;

    React.useEffect(() => {
        resetSession();
        startTimer();

        return () => {
            stopTimer();
        };
    }, [consultationSessionKey, resetSession, startTimer, stopTimer]);

    React.useEffect(() => {
        let isCancelled = false;

        const loadConsultationSettings = async () => {
            if (!clinicId || !doctorId) return;

            try {
                const settings: any = await api.get(API_ENDPOINTS.SETTINGS.GET(clinicId, doctorId));
                const value = Number(settings?.pencil_thickness);
                const normalized = Number.isFinite(value)
                    ? Math.max(1, Math.min(50, value))
                    : 1.5;

                if (!isCancelled) {
                    setPenThickness(normalized);

                    const nextVisibility: Record<string, boolean> = DEFAULT_PDF_SECTION_IDS
                        .reduce((acc, id) => ({ ...acc, [id]: true }), {} as Record<string, boolean>);
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
                }
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
    }, [clinicId, doctorId]);

    // Pre-fill from latest history if no draft was restored and state is empty
    React.useEffect(() => {
        if (!isLoadingPatient && latestConsultation && patientId && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            // Check if a draft exists first
            DraftService.loadDraft(patientId).then((draft) => {
                if (draft) return;

                // Check if current consultation is empty
                const isEmpty = SECTION_KEYS.every(key => (consultation[key] as any[]).length === 0);

                if (isEmpty) {
                    if (__DEV__) console.log('[Consultation] Pre-filling from latest history');
                    const historyState = mapToConsultationState(latestConsultation);
                    if (Object.keys(historyState).length > 0) {
                        restoreDraft(historyState);
                    }
                }
            });
        }
    }, [isLoadingPatient, latestConsultation, patientId, restoreDraft]);

    const { suggestions, isLoadingSuggestions, onSuggestionSelect,refreshSuggestions } = useConsultationSuggestions({
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

    const preparePrintPreview = (
        enabledSectionIds?: string[],
        overrideFollowUpDate?: Date | null,
        overrideRenderOptions?: PdfFilterRenderOptions
    ) => {
        if (!patient || !user) {
            Alert.alert('Error', 'Patient or User data missing');
            return;
        }
        const resolvedFollowUpDate = overrideFollowUpDate !== undefined ? overrideFollowUpDate : followUpDate;
        const ids = enabledSectionIds && enabledSectionIds.length > 0
            ? enabledSectionIds
            : DEFAULT_PDF_SECTION_IDS.filter((id) => pdfSectionVisibility[id] !== false);
        const renderOptions = overrideRenderOptions || pdfRenderOptions;
        const allSections: PdfSection[] = [
            { id: 'complaints', title: 'Complaints', items: complaints },
            { id: 'diagnosis', title: 'Diagnosis', items: diagnoses },
            { id: 'examination', title: 'Examination', items: examinations },
            { id: 'investigation', title: 'Investigation', items: investigations },
            { id: 'procedure', title: 'Procedures', items: procedures },
            { id: 'prescriptions', title: 'Prescriptions', items: prescriptions.map((p) => ({ ...p, isPrescription: true })) },
            { id: 'instruction', title: 'Instructions', items: instructions },
            { id: 'notes', title: 'Notes', items: notes },
        ].filter((section) => section.items.length > 0) as PdfSection[];
        const sections = allSections.filter((section) => ids.includes(section.id));
        const data = {
            patient,
            doctor: user,
            date: new Date().toLocaleDateString('en-GB'),
            sections,
            followUpDate: resolvedFollowUpDate ? resolvedFollowUpDate.toLocaleDateString('en-GB') : undefined,
        };
        setPreviewHtml(PdfService.generateHtml(data, renderOptions));
        setPreviewData({
            ...data,
            __renderOptions: renderOptions,
            __availableSections: allSections,
            __selectedSectionIds: ids,
        });
        setIsPrintPreviewVisible(true);
    };

    const addToCurrentSection = () => {
        const text = writingText.trim();
        if (!text && currentInputStrokes.length === 0) return;

        if (activeTab === 'prescriptions') {
            setEditingItem(null);
            setCurrentPrescriptionData({
                brandName: text,
                genericName: '',
                variants: [{
                    id: Date.now().toString(),
                    timings: 'M-A-E-N',
                    dosage: '',
                    duration: '5 Days',
                    type: 'Tablet',
                    instructions: ''
                }]
            });
            setIsPrescriptionEditModalVisible(true);
            setWritingText('');
            setCurrentInputStrokes([]);
            return;
        }

        onSuggestionSelect({ id: Date.now().toString(), label: text, drawings: currentInputStrokes } as ConsultationSuggestion);
        setWritingText('');
        setCurrentInputStrokes([]);
    };

    const handleStrokesChange = useCallback((section: TabType, id: string, strokes: StrokeData[]) => setStrokes(section, id, strokes), [setStrokes]);

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
                    }
                },
            ]
        );
    }, [isConsultationInProgress, router, stopTimer]);
    const handleNext = () => {
        stopTimer();
        setIsFollowUpModalVisible(true);
    };
    const handleFollowUpContinue = (date: Date) => {
        stopTimer();
        setFollowUpDate(date);
        setIsFollowUpModalVisible(false);
        preparePrintPreview(undefined, date);
    };
    const handleFollowUpSkip = () => {
        stopTimer();
        setFollowUpDate(null);
        setIsFollowUpModalVisible(false);
        preparePrintPreview(undefined, null);
    };
    const generatePdfReport = async (enabledSectionIds: string[], renderOptions: PdfFilterRenderOptions) => {
        setPdfRenderOptions(renderOptions);
        preparePrintPreview(enabledSectionIds, undefined, renderOptions);
    };

    const handleExpandRow = (section: TabType, id: string) => {
        const item = (consultation[section] as ConsultationItem[]).find((entry) => entry.id === id);
        if (item) updateItem(section, id, { height: (item.height || 60) + 40 });
    };


    const handleClearAll = (_section: TabType) => {
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
    };

    const handleEditRow = (section: TabType, item: ConsultationItem) => {
        setEditingItem({ section, id: item.id });
        if (section === 'prescriptions') {
            setCurrentPrescriptionData({
                brandName: item.name,
                genericName: item.genericName || '',
                variants: [{
                    id: item.id,
                    timings: item.timings || '',
                    dosage: item.dosage || '',
                    duration: item.duration || '',
                    instructions: item.instructions || '',
                    type: (item as any).type || 'Tablet'
                }]
            });
            setIsPrescriptionEditModalVisible(true);
        } else {
            setEditModalTitle(`Edit ${section}`);
            setEditModalText(item.name);
            setIsEditModalVisible(true);
        }
    };

    const handleAddNewProperty = () => {
        if (activeTab === 'prescriptions') {
            Alert.alert('Info', 'Prescription property management is handled separately.');
            return;
        }
        setEditingItem(null);
        setEditingPropertySuggestion(null);
        setEditModalTitle(`Add New ${SECTION_LABELS[activeTab]}`);
        setEditModalText(writingText);
        setIsEditModalVisible(true);
    };

    const handleEditProperty = (suggestion: ConsultationSuggestion) => {
        setEditingItem(null);
        setEditingPropertySuggestion(suggestion);
        setEditModalTitle(`Edit ${SECTION_LABELS[activeTab]} Property`);
        setEditModalText(suggestion.label);
        setIsEditModalVisible(true);
    };

    const handleDeleteProperty = (suggestion: ConsultationSuggestion) => {
        Alert.alert(
            'Delete Property',
            `Are you sure you want to delete "${suggestion.label}" from ${SECTION_LABELS[activeTab]} suggestions?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const category = activeTab as any; // Cast for now, service handles checking
                            await MasterDataRepository.deleteItem(category, suggestion.id);
                            await refreshSuggestions();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete property');
                        }
                    }
                }
            ]
        );
    };

    const handleEditCurrentInput = () => {
        setEditingItem(null);
        setEditModalTitle(`Edit ${activeTab}`);
        setEditModalText(writingText);
        setIsEditModalVisible(true);
    };
 

    const saveEditModal = async () => {
        if (editingPropertySuggestion) {
            // Edit Master Property
            try {
                const category = activeTab as any;
                await MasterDataRepository.updateItem(category, editingPropertySuggestion.id, editModalText);
                await refreshSuggestions();
            } catch (error) {
                Alert.alert('Error', 'Failed to update property');
            }
        } else if (editingItem) {
            // Edit Consultation Row
            updateItem(editingItem.section, editingItem.id, { name: editModalText });
        } else if (editModalTitle.startsWith('Add New')) {
            // Add NEW Master Property
            try {
                const category = activeTab as any;
                await MasterDataRepository.addItem(category, editModalText);
                await refreshSuggestions();
            } catch (error) {
                Alert.alert('Error', 'Failed to add property');
            }
        } else {
            // Edit Draft Input
            setWritingText(editModalText);
        }
        setIsEditModalVisible(false);
    };

    const savePrescriptionEdit = (data: PrescriptionData) => {
        const v = data.variants[0];
        if (editingItem && editingItem.section === 'prescriptions') {
            updateItem('prescriptions', editingItem.id, {
                name: data.brandName,
                genericName: data.genericName,
                dosage: v.dosage,
                duration: v.duration,
                instructions: v.instructions,
                timings: v.timings,
            });
        } else {
            // New Prescription Item
            const newItem: ConsultationItem = {
                id: Date.now().toString(),
                name: data.brandName,
                genericName: data.genericName,
                dosage: v.dosage || '',
                duration: v.duration || '5 Days',
                instructions: v.instructions || '',
                timings: v.timings || '',
                type: v.type || 'Tablet',
                drawings: [],
            };
            addItem('prescriptions', newItem);
        }
        setIsPrescriptionEditModalVisible(false);
    };

    return (
        <ErrorBoundary>
            <ConsultationScreenContent
                isWeb={isWeb}
                patientId={patientId}
                patient={patient}
                user={user}
                isLoadingPatient={isLoadingPatient}
                patientError={patientError}
                onErrorBack={() => {
                    stopTimer();
                    router.replace('/(app)/dashboard');
                }}
                onBack={handleBack}
                onNext={handleNext}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                suggestions={suggestions}
                isLoadingSuggestions={isLoadingSuggestions}
                onSuggestionSelect={onSuggestionSelect}
                writingText={writingText}
                onWritingTextChange={setWritingText}
                onEditCurrentInput={handleEditCurrentInput}
                onAddToCurrentSection={addToCurrentSection}
                currentInputStrokes={currentInputStrokes}
                onCurrentInputStrokesChange={setCurrentInputStrokes}
                onClearInput={() => { setWritingText(''); setCurrentInputStrokes([]); }}
                onClearAll={handleClearAll}
                elapsedTime={elapsedTime}
                scrollViewRef={scrollViewRef}
                penThickness={penThickness}
                complaints={complaints}
                diagnoses={diagnoses}
                examinations={examinations}
                investigations={investigations}
                procedures={procedures}
                prescriptions={prescriptions}
                instructions={instructions}
                notes={notes}
                clearSection={clearSection}
                removeItem={removeItem}
                onClearRow={clearItemDrawings}
                onExpandRow={handleExpandRow}
                onStrokesChange={handleStrokesChange}
                onEditRow={handleEditRow}
                addItem={addItem}
                isPrescriptionModalVisible={isPrescriptionModalVisible}
                setIsPrescriptionModalVisible={setIsPrescriptionModalVisible}
                currentPrescriptionData={currentPrescriptionData}
                isFollowUpModalVisible={isFollowUpModalVisible}
                setIsFollowUpModalVisible={setIsFollowUpModalVisible}
                onFollowUpSkip={handleFollowUpSkip}
                onFollowUpContinue={handleFollowUpContinue}
                isPrintPreviewVisible={isPrintPreviewVisible}
                setIsPrintPreviewVisible={setIsPrintPreviewVisible}
                onSaveConsultation={submit}
                onGeneratePdfReport={generatePdfReport}
                previewHtml={previewHtml}
                previewData={previewData}
                isHistoryVisible={isHistoryVisible}
                setIsHistoryVisible={setIsHistoryVisible}
                isPhotosVisible={isPhotosVisible}
                setIsPhotosVisible={setIsPhotosVisible}
                isLabsVisible={isLabsVisible}
                setIsLabsVisible={setIsLabsVisible}
                patientPhotos={patientPhotos}
                patientLabs={patientLabs}
                isLoadingAssets={isLoadingAssets}
                onCapturePhoto={handleCapturePhoto}
                isEditProfileVisible={isEditProfileVisible}
                setIsEditProfileVisible={setIsEditProfileVisible}
                isEditModalVisible={isEditModalVisible}
                setIsEditModalVisible={setIsEditModalVisible}
                editModalTitle={editModalTitle}
                editModalText={editModalText}
                setEditModalText={setEditModalText}
                onSaveEditModal={saveEditModal}
                isPrescriptionEditModalVisible={isPrescriptionEditModalVisible}
                setIsPrescriptionEditModalVisible={setIsPrescriptionEditModalVisible}
                onSavePrescriptionEdit={savePrescriptionEdit}
                onAddNewProperty={handleAddNewProperty}
                onEditProperty={handleEditProperty}
                onDeleteProperty={handleDeleteProperty}
            />
            <EditProfileModal
                visible={isEditProfileVisible}
                onClose={() => setIsEditProfileVisible(false)}
                patient={patient}
                onSave={(updated) => setPatient(updated)}
            />
        </ErrorBoundary>
    );
}
