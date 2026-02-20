import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
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
import PrescriptionEditModal from '@/components/consultation/prescription-edit-modal';
import PrintPreviewModal from '@/components/consultation/print-preview-modal';
import type { PdfFilterRenderOptions } from '@/components/consultation/pdf-filter-modal';
import type { FollowupInfoSelection } from '@/components/consultation/followup-info-modal';
import { VisitHistoryModal } from '@/components/patient/VisitHistoryModal';
import { AssetGalleryModal } from '@/components/patient/AssetGalleryModal';
import type { Asset, ConsultationItem, Patient, User } from '@/entities';
import type { TabType } from '@/hooks/useConsultation';
import { CONSULTATION_ICONS, DASHBOARD_ICONS } from '@/constants/icons';
import type { ConsultationSuggestion } from '@/features/consultation/hooks/useConsultationSuggestions';

const DEFAULT_PEN_COLOR = '#1a365d';
const CANVAS_FILL_STYLE = { flex: 1 };
const CONSULTATION_PEN_THICKNESS_FACTOR = 0.6;
const MIN_CONSULTATION_PEN_THICKNESS = 0.5;

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

    onDrawingActive?: (active: boolean) => void;
    scrollViewRef: React.RefObject<ScrollView | null>;
    penThickness: number;

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
    onClearRow: (section: TabType, id: string) => void;
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
    onGeneratePdfReport: (enabledSectionIds: string[], renderOptions: PdfFilterRenderOptions) => Promise<void>;
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
    isPrescriptionEditModalVisible: boolean;
    setIsPrescriptionEditModalVisible: (visible: boolean) => void;
    onSavePrescriptionEdit: (data: PrescriptionData) => void;

    onAddNewProperty: () => void;
    onEditProperty: (suggestion: ConsultationSuggestion) => void;
    onDeleteProperty: (suggestion: ConsultationSuggestion) => void;
}

interface ConsultationRowCanvasProps {
    item: ConsultationItem;
    index: number;
    sectionKey: TabType;
    penThickness: number;
    onDrawingActive?: (active: boolean) => void;
    onExpandRow: (section: TabType, id: string) => void;
    onRemoveItem: (section: TabType, id: string) => void;
    onStrokesChange: (section: TabType, id: string, strokes: any[]) => void;
    onEditRow: (section: TabType, item: ConsultationItem) => void;
    onClearRow: (section: TabType, id: string) => void;
}

const ConsultationRowCanvas = React.memo(function ConsultationRowCanvas({
    item,
    index,
    sectionKey,
    penThickness,
    onDrawingActive,
    onExpandRow,
    onRemoveItem,
    onStrokesChange,
    onEditRow,
    onClearRow,
}: ConsultationRowCanvasProps) {
    const handleExpand = React.useCallback(() => onExpandRow(sectionKey, item.id), [onExpandRow, sectionKey, item.id]);
    const handleDelete = React.useCallback(() => onRemoveItem(sectionKey, item.id), [onRemoveItem, sectionKey, item.id]);
    const handleStrokeChange = React.useCallback((strokes: any[]) => onStrokesChange(sectionKey, item.id, strokes), [onStrokesChange, sectionKey, item.id]);
    const handleEdit = React.useCallback(() => onEditRow(sectionKey, item), [onEditRow, sectionKey, item]);
    const handleClear = React.useCallback(() => onClearRow(sectionKey, item.id), [onClearRow, sectionKey, item.id]);

    return (
        <DrawingCanvas
            index={index}
            prescription={item}
            onExpand={handleExpand}
            onDelete={handleDelete}
            onStrokesChange={handleStrokeChange}
            initialDrawings={item.drawings}
            penColor={DEFAULT_PEN_COLOR}
            penThickness={penThickness}
            isErasing={false}
            onDrawingActive={onDrawingActive}
            onEdit={handleEdit}
            onClear={handleClear}
            showIndex={sectionKey === 'prescriptions'}
            isFullWidth={sectionKey !== 'prescriptions'}
        />
    );
}, (prev, next) =>
    prev.item === next.item &&
    prev.index === next.index &&
    prev.sectionKey === next.sectionKey &&
    prev.penThickness === next.penThickness &&
    prev.onDrawingActive === next.onDrawingActive
);

interface ConsultationSectionBlockProps {
    title: string;
    sectionKey: TabType;
    items: ConsultationItem[];
    penThickness: number;
    onDrawingActive?: (active: boolean) => void;
    clearSection: (section: TabType) => void;
    onExpandRow: (section: TabType, id: string) => void;
    onRemoveItem: (section: TabType, id: string) => void;
    onStrokesChange: (section: TabType, id: string, strokes: any[]) => void;
    onEditRow: (section: TabType, item: ConsultationItem) => void;
    onClearRow: (section: TabType, id: string) => void;
}

const ConsultationSectionBlock = React.memo(function ConsultationSectionBlock({
    title,
    sectionKey,
    items,
    penThickness,
    onDrawingActive,
    clearSection,
    onExpandRow,
    onRemoveItem,
    onStrokesChange,
    onEditRow,
    onClearRow,
}: ConsultationSectionBlockProps) {
    if (items.length === 0) return null;

    const handleClearSection = React.useCallback(() => clearSection(sectionKey), [clearSection, sectionKey]);

    return (
        <View className="mb-4">
            <View className="flex-row px-4 py-2 bg-[#F2F4F8] border-b border-gray-200">
                <Text className="text-black font-bold text-base">{title}</Text>
                <TouchableOpacity onPress={handleClearSection}>
                    <Icon icon={CONSULTATION_ICONS.trashOutline} size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>
            {items.map((item, index) => (
                <ConsultationRowCanvas
                    key={item.id}
                    item={item}
                    index={index}
                    sectionKey={sectionKey}
                    penThickness={penThickness}
                    onDrawingActive={onDrawingActive}
                    onExpandRow={onExpandRow}
                    onRemoveItem={onRemoveItem}
                    onStrokesChange={onStrokesChange}
                    onEditRow={onEditRow}
                    onClearRow={onClearRow}
                />
            ))}
        </View>
    );
}, (prev, next) =>
    prev.title === next.title &&
    prev.sectionKey === next.sectionKey &&
    prev.items === next.items &&
    prev.penThickness === next.penThickness &&
    prev.onDrawingActive === next.onDrawingActive
);

export function ConsultationScreenContent(props: ConsultationScreenContentProps) {
    const effectivePenThickness = Math.max(
        MIN_CONSULTATION_PEN_THICKNESS,
        props.penThickness * CONSULTATION_PEN_THICKNESS_FACTOR
    );

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

    return (
        <View className="flex-1 bg-white" style={props.isWeb ? { alignItems: 'center' } : { flex: 1, width: '100%' }}>
            {props.patientError ? (
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
                                    canvasOnly
                                    initialDrawings={props.currentInputStrokes}
                                    onStrokesChange={props.onCurrentInputStrokesChange}
                                    penColor={DEFAULT_PEN_COLOR}
                                    penThickness={effectivePenThickness}
                                    isErasing={false}
                                    style={CANVAS_FILL_STYLE}
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
                >
                    <View className="mt-2">
                        {(props.activeTab === 'complaints' || props.complaints.length > 0) && (
                            <ConsultationSectionBlock
                                title="Complaints"
                                sectionKey="complaints"
                                items={props.complaints}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'diagnosis' || props.diagnoses.length > 0) && (
                            <ConsultationSectionBlock
                                title="Diagnosis"
                                sectionKey="diagnosis"
                                items={props.diagnoses}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'examination' || props.examinations.length > 0) && (
                            <ConsultationSectionBlock
                                title="Examination"
                                sectionKey="examination"
                                items={props.examinations}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'investigation' || props.investigations.length > 0) && (
                            <ConsultationSectionBlock
                                title="Investigation"
                                sectionKey="investigation"
                                items={props.investigations}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'procedure' || props.procedures.length > 0) && (
                            <ConsultationSectionBlock
                                title="Procedure"
                                sectionKey="procedure"
                                items={props.procedures}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'prescriptions' || props.prescriptions.length > 0) && (
                            <ConsultationSectionBlock
                                title="Prescriptions"
                                sectionKey="prescriptions"
                                items={props.prescriptions}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'instruction' || props.instructions.length > 0) && (
                            <ConsultationSectionBlock
                                title="Instruction"
                                sectionKey="instruction"
                                items={props.instructions}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                        {(props.activeTab === 'notes' || props.notes.length > 0) && (
                            <ConsultationSectionBlock
                                title="Notes"
                                sectionKey="notes"
                                items={props.notes}
                                penThickness={effectivePenThickness}
                                onDrawingActive={props.onDrawingActive}
                                clearSection={props.clearSection}
                                onExpandRow={props.onExpandRow}
                                onRemoveItem={props.removeItem}
                                onStrokesChange={props.onStrokesChange}
                                onEditRow={props.onEditRow}
                                onClearRow={props.onClearRow}
                            />
                        )}
                    </View>
                </ScrollView>

                <PrescriptionModal
                    visible={props.isPrescriptionModalVisible}
                    onClose={() => props.setIsPrescriptionModalVisible(false)}
                    onApplyVariant={(variant, brandName, genericName) => {
                        const id = Date.now().toString();
                        const newItem: ConsultationItem = {
                            id,
                            name: brandName,
                            genericName: genericName,
                            dosage: variant.dosage || 'N/A',
                            duration: variant.duration || '90 Days',
                            instructions: variant.instructions || '',
                            timings: variant.timings || '',
                        };
                        props.addItem('prescriptions', newItem);
                        props.setIsPrescriptionModalVisible(false);
                    }}
                    initialData={props.currentPrescriptionData || undefined}
                />

                <PrescriptionEditModal
                    visible={props.isPrescriptionEditModalVisible}
                    onClose={() => props.setIsPrescriptionEditModalVisible(false)}
                    onSave={props.onSavePrescriptionEdit}
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
                    <Pressable className="flex-1 bg-black/40 justify-center items-center px-4" onPress={() => props.setIsEditModalVisible(false)}>
                        <Pressable
                            onPress={(event) => event.stopPropagation()}
                            className="bg-white w-full max-w-[400px] rounded-2xl overflow-hidden shadow-xl"
                        >
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
                        </Pressable>
                    </Pressable>
                </Modal>
            </View>
        </View>
    );
}
