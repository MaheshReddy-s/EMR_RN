import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import ConsultationHeader from '@/components/consultation/consultation-header';
import ConsultationTabs from '@/components/consultation/consultation-tabs';
import DrawingCanvas from '@/components/consultation/drawing-canvas';
import FollowUpModal from '@/components/consultation/follow-up-modal';
import PrescriptionModal, { PrescriptionData } from '@/components/consultation/prescription-modal';
import PrintPreviewModal from '@/components/consultation/print-preview-modal';
import type { FollowupInfoSelection } from '@/components/consultation/followup-info-modal';
import { VisitHistoryModal } from '@/components/patient/VisitHistoryModal';
import { AssetGalleryModal } from '@/components/patient/AssetGalleryModal';
import type { Asset, ConsultationItem, Patient, User } from '@/entities';
import type { TabType } from '@/hooks/useConsultation';
import { CONSULTATION_ICONS, DASHBOARD_ICONS } from '@/constants/icons';
import type { ConsultationSuggestion } from '@/features/consultation/hooks/useConsultationSuggestions';

const DEFAULT_PEN_COLOR = '#1a365d';
const DEFAULT_PEN_THICKNESS = 1.5;

const TABS: { id: TabType; label: string }[] = [
    { id: 'instruction', label: 'Instruction' },
    { id: 'procedure', label: 'Procedure' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'investigation', label: 'Investigation' },
    { id: 'examination', label: 'Examination' },
    { id: 'notes', label: 'Notes' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'diagnosis', label: 'Diagnosis' },
];

interface ConsultationScreenContentProps {
    isWeb: boolean;
    patientId: string;
    patient: Patient | null;
    user: User | null;
    isLoadingPatient: boolean;
    patientError: string | null;
    onErrorBack: () => void;
    onBack: () => void;
    onNext: () => void;

    activeTab: TabType;
    onTabChange: (tab: TabType) => void;

    suggestions: ConsultationSuggestion[];
    isLoadingSuggestions: boolean;
    onSuggestionSelect: (suggestion: ConsultationSuggestion) => void;

    writingText: string;
    onWritingTextChange: (text: string) => void;
    onEditCurrentInput: () => void;
    onAddToCurrentSection: () => void;
    currentInputStrokes: any[];
    onCurrentInputStrokesChange: (strokes: any[]) => void;
    onClearInput: () => void;
    onClearAll: (section: TabType) => void;
    elapsedTime: string;

    isDrawingActive: boolean;
    onDrawingActive: (active: boolean) => void;
    scrollViewRef: React.RefObject<ScrollView | null>;

    complaints: ConsultationItem[];
    diagnoses: ConsultationItem[];
    examinations: ConsultationItem[];
    investigations: ConsultationItem[];
    procedures: ConsultationItem[];
    prescriptions: ConsultationItem[];
    instructions: ConsultationItem[];
    notes: ConsultationItem[];

    clearSection: (section: TabType) => void;
    removeItem: (section: TabType, id: string) => void;
    onExpandRow: (section: TabType, id: string) => void;
    onStrokesChange: (section: TabType, id: string, strokes: any[]) => void;
    onEditRow: (section: TabType, item: ConsultationItem) => void;
    addItem: (section: TabType, item: ConsultationItem) => void;

    isPrescriptionModalVisible: boolean;
    setIsPrescriptionModalVisible: (visible: boolean) => void;
    currentPrescriptionData: PrescriptionData | null;

    isFollowUpModalVisible: boolean;
    setIsFollowUpModalVisible: (visible: boolean) => void;
    onFollowUpSkip: () => void;
    onFollowUpContinue: (date: Date) => void;

    isPrintPreviewVisible: boolean;
    setIsPrintPreviewVisible: (visible: boolean) => void;
    onSaveConsultation: (selection: FollowupInfoSelection) => Promise<void>;
    onGeneratePdfReport: (enabledSectionIds: string[]) => Promise<void>;
    previewHtml: string;
    previewData: any;

    isHistoryVisible: boolean;
    setIsHistoryVisible: (visible: boolean) => void;
    isPhotosVisible: boolean;
    setIsPhotosVisible: (visible: boolean) => void;
    isLabsVisible: boolean;
    setIsLabsVisible: (visible: boolean) => void;
    patientPhotos: Asset[];
    patientLabs: Asset[];
    isLoadingAssets: boolean;
    onCapturePhoto: () => Promise<void>;

    isEditProfileVisible: boolean;
    setIsEditProfileVisible: (visible: boolean) => void;
    isEditModalVisible: boolean;
    setIsEditModalVisible: (visible: boolean) => void;
    editModalTitle: string;
    editModalText: string;
    setEditModalText: (text: string) => void;
    onSaveEditModal: () => void;

    onAddNewProperty: () => void;
    onEditProperty: (suggestion: ConsultationSuggestion) => void;
    onDeleteProperty: (suggestion: ConsultationSuggestion) => void;
}

export function ConsultationScreenContent(props: ConsultationScreenContentProps) {
    const renderSuggestionChip = (suggestion: ConsultationSuggestion) => (
        <TouchableOpacity
            key={suggestion.id}
            onPress={() => props.onSuggestionSelect(suggestion)}
            activeOpacity={0.7}
            className="bg-white px-3 py-2 rounded-xl mr-2 mb-2 border border-gray-100"
            style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
            }}
        >
            <Text className="text-gray-800 text-[13px] font-semibold">
                {suggestion.label}
            </Text>
        </TouchableOpacity>
    );

    const renderSectionRows = (items: ConsultationItem[], title: string, sectionKey: TabType) => {
        if (items.length === 0) return null;

        return (
            <View className="mb-4">
                <View className="flex-row px-4 py-2 bg-[#F2F4F8] border-b border-gray-200">
                    <Text className="text-black font-bold text-base">{title}</Text>
                    <TouchableOpacity onPress={() => props.clearSection(sectionKey)}>
                        <Icon icon={CONSULTATION_ICONS.trashOutline} size={24} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                {items.map((item, index) => (
                    <DrawingCanvas
                        key={item.id}
                        index={index}
                        prescription={{
                            ...item,
                            height: item.height || 32,
                        }}
                        onExpand={() => props.onExpandRow(sectionKey, item.id)}
                        onDelete={() => props.removeItem(sectionKey, item.id)}
                        onStrokesChange={(strokes) => props.onStrokesChange(sectionKey, item.id, strokes)}
                        initialDrawings={item.drawings}
                        penColor={DEFAULT_PEN_COLOR}
                        penThickness={DEFAULT_PEN_THICKNESS}
                        isErasing={false}
                        onDrawingActive={props.onDrawingActive}
                        onEdit={() => props.onEditRow(sectionKey, item)}
                        showIndex={false}
                        isFullWidth={sectionKey !== 'prescriptions'}
                    />
                ))}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white" style={props.isWeb ? { alignItems: 'center' } : { flex: 1, width: '100%' }}>
            {props.isLoadingPatient ? (
                <View className="absolute inset-0 z-50 bg-white justify-center items-center">
                    <ActivityIndicator size="large" color="#1a365d" />
                    <Text className="mt-4 text-gray-500 font-medium font-sans">Loading Patient Records...</Text>
                </View>
            ) : props.patientError ? (
                <View className="absolute inset-0 z-50 bg-white justify-center items-center px-6">
                    <Icon icon={DASHBOARD_ICONS.cancel} size={48} color="#FF3B30" />
                    <Text className="text-xl font-bold text-gray-800 mt-4 mb-2">Something went wrong</Text>
                    <Text className="text-gray-500 text-center mb-6">{props.patientError}</Text>
                    <TouchableOpacity
                        onPress={props.onErrorBack}
                        className="bg-[#1a365d] px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-bold">Go Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            <View style={props.isWeb ? { width: '100%', maxWidth: 960, flex: 1 } : { flex: 1, width: '100%' }}>
                <ConsultationHeader
                    patientName={props.patient?.patient_name || 'Loading...'}
                    patientMobile={props.patient?.patient_mobile || ''}
                    patientAge={typeof props.patient?.age === 'string' ? parseInt(props.patient.age) : props.patient?.age}
                    patientGender={props.patient?.gender}
                    consultationDate={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    onBack={props.onBack}
                    onNext={props.onNext}
                    onEditProfile={() => props.setIsEditProfileVisible(true)}
                    onViewHistory={() => props.setIsHistoryVisible(true)}
                    onViewPhotographs={() => props.setIsPhotosVisible(true)}
                    onViewLabReports={() => props.setIsLabsVisible(true)}
                />

                <ConsultationTabs activeTab={props.activeTab} onTabChange={props.onTabChange} />

                <View className="bg-[#F2F4F8] p-1 min-h-[150px] flex-row max-h-[150px]">
                    <ScrollView
                        className="flex-1"
                        nestedScrollEnabled
                        contentContainerStyle={{ paddingBottom: 10 }}
                        showsVerticalScrollIndicator
                    >
                        <View className="flex-row flex-wrap items-start content-start">
                            {props.isLoadingSuggestions ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                            ) : (
                                props.suggestions.map(renderSuggestionChip)
                            )}
                        </View>
                    </ScrollView>

                    <View className="justify-end px-2 pb-2" />
                </View>

                <View className="px-4 py-3 bg-white">
                    <View className="flex-row items-center mb-3">
                        <Text className="text-gray-400 text-[13.5px] font-medium mr-1">
                            Add or Search {TABS.find((t) => t.id === props.activeTab)?.label}:
                        </Text>
                        <Text className="text-black text-[14px] font-bold mr-3" numberOfLines={1}>
                            {props.writingText || '...'}
                        </Text>

                        <View className="flex-row items-center gap-4">
                            <TouchableOpacity
                                className="flex-row items-center"
                                activeOpacity={0.7}
                                onPress={props.onEditCurrentInput}
                            >
                                <Icon icon={CONSULTATION_ICONS.pencil} size={20} color="#007AFF" />
                                <Text className="text-[#007AFF] text-[13.5px] font-medium ml-1">Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-row items-center"
                                activeOpacity={0.7}
                                onPress={props.onAddToCurrentSection}
                            >
                                <Icon icon={CONSULTATION_ICONS.add} size={22} color="#007AFF" />
                                <Text className="text-[#007AFF] text-[13.5px] font-medium ml-1">Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                        <View className="flex-1 bg-white border border-gray-100 rounded-2xl h-32 shadow-sm relative overflow-hidden" style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 }}>
                            <View className="absolute inset-0 z-10" pointerEvents="box-none">
                                <DrawingCanvas
                                    key={`input-canvas-${props.currentInputStrokes.length}`}
                                    canvasOnly
                                    initialDrawings={props.currentInputStrokes}
                                    onStrokesChange={props.onCurrentInputStrokesChange}
                                    penColor={DEFAULT_PEN_COLOR}
                                    penThickness={DEFAULT_PEN_THICKNESS}
                                    isErasing={false}
                                    onDrawingActive={props.onDrawingActive}
                                    style={{ flex: 1 }}
                                />
                            </View>

                            <TextInput
                                className="absolute inset-0 z-20 text-[18px] text-gray-800 text-center px-4"
                                placeholder="Write or Type here"
                                placeholderTextColor="#ccc"
                                value={props.writingText}
                                onChangeText={props.onWritingTextChange}
                                onSubmitEditing={props.onAddToCurrentSection}
                                multiline
                                textAlignVertical="top"
                                style={{ backgroundColor: 'transparent', paddingTop: 28 }}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={props.onClearInput}
                            className="w-12 h-12 items-center justify-center -mr-2"
                            activeOpacity={0.7}
                        >
                            <Icon icon={CONSULTATION_ICONS.brush} size={32} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row items-center justify-end mt-4">
                        <TouchableOpacity
                            onPress={() => props.onClearAll(props.activeTab)}
                            className="border border-[#007AFF] rounded-lg px-4 py-1.5 mr-3"
                        >
                            <Text className="text-[#007AFF] text-[13.5px] font-medium">Clear All</Text>
                        </TouchableOpacity>
                        <Text className="text-black text-[18px] font-semibold tracking-tight min-w-[80px] text-right">
                            {props.elapsedTime}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    ref={props.scrollViewRef}
                    className="flex-1 bg-white"
                    contentContainerStyle={{ paddingBottom: 100 }}
                    scrollEnabled={!props.isDrawingActive}
                >
                    <View className="mt-2">
                        {(props.activeTab === 'complaints' || props.complaints.length > 0) && renderSectionRows(props.complaints, 'Complaints', 'complaints')}
                        {(props.activeTab === 'diagnosis' || props.diagnoses.length > 0) && renderSectionRows(props.diagnoses, 'Diagnosis', 'diagnosis')}
                        {(props.activeTab === 'examination' || props.examinations.length > 0) && renderSectionRows(props.examinations, 'Examination', 'examination')}
                        {(props.activeTab === 'investigation' || props.investigations.length > 0) && renderSectionRows(props.investigations, 'Investigation', 'investigation')}
                        {(props.activeTab === 'procedure' || props.procedures.length > 0) && renderSectionRows(props.procedures, 'Procedure', 'procedure')}
                        {(props.activeTab === 'prescriptions' || props.prescriptions.length > 0) && renderSectionRows(props.prescriptions, 'Prescriptions', 'prescriptions')}
                        {(props.activeTab === 'instruction' || props.instructions.length > 0) && renderSectionRows(props.instructions, 'Instruction', 'instruction')}
                        {(props.activeTab === 'notes' || props.notes.length > 0) && renderSectionRows(props.notes, 'Notes', 'notes')}
                    </View>
                </ScrollView>

                <PrescriptionModal
                    visible={props.isPrescriptionModalVisible}
                    onClose={() => props.setIsPrescriptionModalVisible(false)}
                    onSave={(data) => {
                        const id = Date.now().toString();
                        const primaryVariant = data.variants[0];
                        const newItem: ConsultationItem = {
                            id,
                            name: data.brandName,
                            genericName: data.genericName,
                            dosage: primaryVariant?.timings || 'M-O-E-N',
                            duration: primaryVariant?.duration || '90 Days',
                        };
                        props.addItem('prescriptions', newItem);
                        props.setIsPrescriptionModalVisible(false);
                    }}
                    initialData={props.currentPrescriptionData || undefined}
                />

                <FollowUpModal
                    visible={props.isFollowUpModalVisible}
                    onClose={() => props.setIsFollowUpModalVisible(false)}
                    onSkip={props.onFollowUpSkip}
                    onContinue={props.onFollowUpContinue}
                />

                <PrintPreviewModal
                    visible={props.isPrintPreviewVisible}
                    onClose={() => props.setIsPrintPreviewVisible(false)}
                    onDone={props.onSaveConsultation}
                    onShowFilter={() => { }}
                    onGenerateReport={props.onGeneratePdfReport}
                    htmlContent={props.previewHtml}
                    pdfData={props.previewData}
                />

                <VisitHistoryModal
                    visible={props.isHistoryVisible}
                    onClose={() => props.setIsHistoryVisible(false)}
                    patientId={props.patientId}
                />

                <AssetGalleryModal
                    visible={props.isPhotosVisible}
                    onClose={() => props.setIsPhotosVisible(false)}
                    title="Photographs"
                    assets={props.patientPhotos}
                    isLoading={props.isLoadingAssets}
                    onUpload={props.onCapturePhoto}
                />

                <AssetGalleryModal
                    visible={props.isLabsVisible}
                    onClose={() => props.setIsLabsVisible(false)}
                    title="Lab Reports"
                    assets={props.patientLabs}
                    isLoading={props.isLoadingAssets}
                    showCaptureButton={false}
                    onUpload={() => Alert.alert('Upload', 'Upload Lab logic coming soon')}
                />

                <Modal
                    visible={props.isEditModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => props.setIsEditModalVisible(false)}
                >
                    <View className="flex-1 bg-black/40 justify-center items-center px-4">
                        <View className="bg-white w-full max-w-[400px] rounded-2xl overflow-hidden shadow-xl">
                            <View className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex-row justify-between items-center">
                                <Text className="text-gray-900 text-lg font-bold">{props.editModalTitle}</Text>
                                <TouchableOpacity onPress={() => props.setIsEditModalVisible(false)}>
                                    <Icon icon={CONSULTATION_ICONS.backspaceOutline} size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <View className="p-5">
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-[16px] text-gray-800 min-h-[120px]"
                                    multiline
                                    value={props.editModalText}
                                    onChangeText={props.setEditModalText}
                                    autoFocus
                                    textAlignVertical="top"
                                />

                                <View className="flex-row gap-3 mt-5">
                                    <TouchableOpacity
                                        onPress={() => props.setIsEditModalVisible(false)}
                                        className="flex-1 py-3 items-center"
                                    >
                                        <Text className="text-gray-500 font-semibold">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={props.onSaveEditModal}
                                        className="flex-[2] bg-[#007AFF] py-3 rounded-xl items-center shadow-sm"
                                    >
                                        <Text className="text-white font-bold text-base">Done</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
}
