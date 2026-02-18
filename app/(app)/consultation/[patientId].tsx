import React, { useCallback, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EditProfileModal } from '@/components/patient/EditProfileModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ConsultationScreenContent } from '@/features/consultation/components/ConsultationScreenContent';
import { useConsultationDraft } from '@/features/consultation/hooks/useConsultationDraft';
import { useConsultationPatientData } from '@/features/consultation/hooks/useConsultationPatientData';
import { ConsultationSuggestion, useConsultationSuggestions } from '@/features/consultation/hooks/useConsultationSuggestions';
import { useConsultationSubmit } from '@/features/consultation/hooks/useConsultationSubmit';
import { ConsultationItem, StrokeData } from '@/entities';
import { useConsultation, TabType } from '@/hooks/useConsultation';
import { ConsultationRepository, MasterDataRepository } from '@/repositories';
import { DraftService } from '@/services/draft-service';
import { PdfService, PdfSection } from '@/services/pdf-service';

const DEFAULT_PDF_SECTION_IDS = ['complaints', 'diagnosis', 'examination', 'investigation', 'procedure', 'prescriptions', 'instruction', 'notes'];
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
    const isWeb = Platform.OS === 'web';
    const [isDrawingActive, setIsDrawingActive] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const { state: consultation, addItem, removeItem, updateItem, setStrokes, clearSection, restoreDraft } = useConsultation();
    const { complaints, diagnosis: diagnoses, examination: examinations, investigation: investigations, procedure: procedures, prescriptions, instruction: instructions, notes, elapsedTime } = consultation;
    const [currentInputStrokes, setCurrentInputStrokes] = useState<StrokeData[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('instruction');
    const [writingText, setWritingText] = useState('');
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editModalTitle, setEditModalTitle] = useState('');
    const [editModalText, setEditModalText] = useState('');
    const [editingItem, setEditingItem] = useState<{ section: TabType; id: string } | null>(null);
    const [isPrescriptionModalVisible, setIsPrescriptionModalVisible] = useState(false);
    const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [isPhotosVisible, setIsPhotosVisible] = useState(false);
    const [isLabsVisible, setIsLabsVisible] = useState(false);
    const [currentPrescriptionData, setCurrentPrescriptionData] = useState<any | null>(null);
    const [isFollowUpModalVisible, setIsFollowUpModalVisible] = useState(false);
    const [isPrintPreviewVisible, setIsPrintPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewData, setPreviewData] = useState<any>(null);
    const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
    const [editingPropertySuggestion, setEditingPropertySuggestion] = useState<ConsultationSuggestion | null>(null);

    const { patient, setPatient, isLoadingPatient, patientError, user, patientPhotos, patientLabs, isLoadingAssets, handleCapturePhoto } = useConsultationPatientData({
        patientId,
        isPhotosVisible,
        isLabsVisible,
    });

    useConsultationDraft({ patientId, consultation, restoreDraft });

    const { suggestions, isLoadingSuggestions, onSuggestionSelect, refreshSuggestions } = useConsultationSuggestions({
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

    const preparePrintPreview = (enabledSectionIds?: string[]) => {
        if (!patient || !user) {
            Alert.alert('Error', 'Patient or User data missing');
            return;
        }
        const ids = enabledSectionIds || DEFAULT_PDF_SECTION_IDS;
        const sections: PdfSection[] = [
            { id: 'complaints', title: 'Chief Complaints', items: complaints },
            { id: 'diagnosis', title: 'Diagnosis', items: diagnoses },
            { id: 'examination', title: 'Examination', items: examinations },
            { id: 'investigation', title: 'Investigation', items: investigations },
            { id: 'procedure', title: 'Procedures', items: procedures },
            { id: 'prescriptions', title: 'Prescriptions', items: prescriptions.map((p) => ({ ...p, isPrescription: true })) },
            { id: 'instruction', title: 'Instructions', items: instructions },
            { id: 'notes', title: 'Clinical Notes', items: notes },
        ].filter((section) => ids.includes(section.id) && section.items.length > 0) as PdfSection[];
        const data = {
            patient,
            doctor: user,
            date: new Date().toLocaleDateString('en-GB'),
            sections,
            followUpDate: followUpDate ? followUpDate.toLocaleDateString('en-GB') : undefined,
        };
        setPreviewHtml(PdfService.generateHtml(data));
        setPreviewData(data);
        setIsPrintPreviewVisible(true);
    };

    const addToCurrentSection = async () => {
        const textToSave = writingText.trim();
        if (!textToSave && currentInputStrokes.length === 0) return;

        // 1. Add to current visit
        onSuggestionSelect({
            id: Date.now().toString(),
            label: textToSave,
            drawings: currentInputStrokes
        } as ConsultationSuggestion);

        // 2. Ask to save as master property (except prescriptions)
        if (textToSave && activeTab !== 'prescriptions') {
            Alert.alert(
                'Save Property',
                `Would you like to save "${textToSave}" to your master list of ${SECTION_LABELS[activeTab]}?`,
                [
                    { text: 'No', style: 'cancel' },
                    {
                        text: 'Yes, Save',
                        onPress: async () => {
                            try {
                                await MasterDataRepository.addItem(activeTab as any, textToSave);
                                await refreshSuggestions();
                            } catch (error) {
                                Alert.alert('Error', 'Failed to save master property');
                            }
                        }
                    }
                ]
            );
        }

        setWritingText('');
        setCurrentInputStrokes([]);
    };

    const handleStrokesChange = useCallback((section: TabType, id: string, strokes: StrokeData[]) => setStrokes(section, id, strokes), [setStrokes]);
    const handleBack = () => router.back();
    const handleNext = () => setIsFollowUpModalVisible(true);
    const handleFollowUpContinue = (date: Date) => { setFollowUpDate(date); setIsFollowUpModalVisible(false); preparePrintPreview(); };
    const handleFollowUpSkip = () => { setFollowUpDate(null); setIsFollowUpModalVisible(false); preparePrintPreview(); };
    const generatePdfReport = async (enabledSectionIds: string[]) => preparePrintPreview(enabledSectionIds);

    const handleExpandRow = (section: TabType, id: string) => {
        const item = (consultation[section] as ConsultationItem[]).find((entry) => entry.id === id);
        if (item) updateItem(section, id, { height: (item.height || 60) + 40 });
    };

    const handleEditRow = (section: TabType, item: ConsultationItem) => {
        setEditingItem({ section, id: item.id });
        setEditingPropertySuggestion(null);
        setEditModalTitle(`Edit ${SECTION_LABELS[section]}`);
        setEditModalText(item.name);
        setIsEditModalVisible(true);
    };

    const handleClearAll = (section: TabType) => {
        Alert.alert('Clear All', `Are you sure you want to clear all items in ${SECTION_LABELS[section]}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => clearSection(section) },
        ]);
    };

    const handleEditCurrentInput = () => {
        setEditingItem(null);
        setEditingPropertySuggestion(null);
        setEditModalTitle(`Edit ${SECTION_LABELS[activeTab]}`);
        setEditModalText(writingText);
        setIsEditModalVisible(true);
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

    return (
        <ErrorBoundary>
            <ConsultationScreenContent
                isWeb={isWeb}
                patientId={patientId}
                patient={patient}
                user={user}
                isLoadingPatient={isLoadingPatient}
                patientError={patientError}
                onErrorBack={() => router.replace('/(app)/dashboard')}
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
                isDrawingActive={isDrawingActive}
                onDrawingActive={setIsDrawingActive}
                scrollViewRef={scrollViewRef}
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
