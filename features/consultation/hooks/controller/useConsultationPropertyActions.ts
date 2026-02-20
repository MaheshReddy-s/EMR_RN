import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import type { ConsultationItem, StrokeData } from '@/entities';
import type { PrescriptionData } from '@/entities/consultation/types';
import type { TabType } from '@/hooks/useConsultation';
import { MasterDataRepository } from '@/repositories';
import { SECTION_LABELS } from '@/features/consultation/utils/consultation-screen-utils';
import type { ConsultationSuggestion } from '@/features/consultation/hooks/useConsultationSuggestions';

export interface EditingRowRef {
    section: TabType;
    id: string;
}

interface UseConsultationPropertyActionsParams {
    activeTab: TabType;
    writingText: string;
    currentInputStrokes: StrokeData[];
    onSuggestionSelect: (suggestion: ConsultationSuggestion) => void;
    refreshSuggestions: () => Promise<void>;
    editingItem: EditingRowRef | null;
    editModalTitle: string;
    editModalText: string;
    editingPropertySuggestion: ConsultationSuggestion | null;
    setEditingItem: Dispatch<SetStateAction<EditingRowRef | null>>;
    setCurrentPrescriptionData: Dispatch<SetStateAction<any | null>>;
    setIsPrescriptionEditModalVisible: Dispatch<SetStateAction<boolean>>;
    setWritingText: Dispatch<SetStateAction<string>>;
    setCurrentInputStrokes: Dispatch<SetStateAction<StrokeData[]>>;
    setEditModalTitle: Dispatch<SetStateAction<string>>;
    setEditModalText: Dispatch<SetStateAction<string>>;
    setIsEditModalVisible: Dispatch<SetStateAction<boolean>>;
    setEditingPropertySuggestion: Dispatch<SetStateAction<ConsultationSuggestion | null>>;
    updateItem: (section: TabType, id: string, changes: Partial<ConsultationItem>) => void;
    addItem: (section: TabType, item: ConsultationItem) => void;
}

export function useConsultationPropertyActions({
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
}: UseConsultationPropertyActionsParams) {
    const addToCurrentSection = useCallback(() => {
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
                    instructions: '',
                }],
            });
            setIsPrescriptionEditModalVisible(true);
            setWritingText('');
            setCurrentInputStrokes([]);
            return;
        }

        onSuggestionSelect({
            id: Date.now().toString(),
            label: text,
            drawings: currentInputStrokes,
        } as ConsultationSuggestion);
        setWritingText('');
        setCurrentInputStrokes([]);
    }, [
        activeTab,
        currentInputStrokes,
        onSuggestionSelect,
        setCurrentInputStrokes,
        setCurrentPrescriptionData,
        setEditingItem,
        setIsPrescriptionEditModalVisible,
        setWritingText,
        writingText,
    ]);

    const handleEditRow = useCallback((section: TabType, item: ConsultationItem) => {
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
                    type: (item as any).type || 'Tablet',
                }],
            });
            setIsPrescriptionEditModalVisible(true);
            return;
        }

        setEditModalTitle(`Edit ${section}`);
        setEditModalText(item.name);
        setIsEditModalVisible(true);
    }, [
        setCurrentPrescriptionData,
        setEditModalText,
        setEditModalTitle,
        setEditingItem,
        setIsEditModalVisible,
        setIsPrescriptionEditModalVisible,
    ]);

    const handleAddNewProperty = useCallback(() => {
        if (activeTab === 'prescriptions') {
            Alert.alert('Info', 'Prescription property management is handled separately.');
            return;
        }
        setEditingItem(null);
        setEditingPropertySuggestion(null);
        setEditModalTitle(`Add New ${SECTION_LABELS[activeTab]}`);
        setEditModalText(writingText);
        setIsEditModalVisible(true);
    }, [
        activeTab,
        setEditModalText,
        setEditModalTitle,
        setEditingItem,
        setEditingPropertySuggestion,
        setIsEditModalVisible,
        writingText,
    ]);

    const handleEditProperty = useCallback((suggestion: ConsultationSuggestion) => {
        setEditingItem(null);
        setEditingPropertySuggestion(suggestion);
        setEditModalTitle(`Edit ${SECTION_LABELS[activeTab]} Property`);
        setEditModalText(suggestion.label);
        setIsEditModalVisible(true);
    }, [
        activeTab,
        setEditModalText,
        setEditModalTitle,
        setEditingItem,
        setEditingPropertySuggestion,
        setIsEditModalVisible,
    ]);

    const handleDeleteProperty = useCallback((suggestion: ConsultationSuggestion) => {
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
                            const category = activeTab as any;
                            await MasterDataRepository.deleteItem(category, suggestion.id);
                            await refreshSuggestions();
                        } catch {
                            Alert.alert('Error', 'Failed to delete property');
                        }
                    },
                },
            ]
        );
    }, [activeTab, refreshSuggestions]);

    const handleEditCurrentInput = useCallback(() => {
        setEditingItem(null);
        setEditModalTitle(`Edit ${activeTab}`);
        setEditModalText(writingText);
        setIsEditModalVisible(true);
    }, [activeTab, setEditModalText, setEditModalTitle, setEditingItem, setIsEditModalVisible, writingText]);

    const saveEditModal = useCallback(async () => {
        if (editingPropertySuggestion) {
            try {
                const category = activeTab as any;
                await MasterDataRepository.updateItem(
                    category,
                    editingPropertySuggestion.id,
                    editModalText
                );
                await refreshSuggestions();
            } catch {
                Alert.alert('Error', 'Failed to update property');
            }
        } else if (editingItem) {
            updateItem(editingItem.section, editingItem.id, { name: editModalText });
        } else if (editModalTitle.startsWith('Add New')) {
            try {
                const category = activeTab as any;
                await MasterDataRepository.addItem(category, editModalText);
                await refreshSuggestions();
            } catch {
                Alert.alert('Error', 'Failed to add property');
            }
        } else {
            setWritingText(editModalText);
        }
        setIsEditModalVisible(false);
    }, [
        activeTab,
        editModalText,
        editModalTitle,
        editingItem,
        editingPropertySuggestion,
        refreshSuggestions,
        setIsEditModalVisible,
        setWritingText,
        updateItem,
    ]);

    const savePrescriptionEdit = useCallback((data: PrescriptionData) => {
        const variant = data.variants[0];
        if (editingItem && editingItem.section === 'prescriptions') {
            updateItem('prescriptions', editingItem.id, {
                name: data.brandName,
                genericName: data.genericName,
                dosage: variant.dosage,
                duration: variant.duration,
                instructions: variant.instructions,
                timings: variant.timings,
            });
        } else {
            const newItem: ConsultationItem = {
                id: Date.now().toString(),
                name: data.brandName,
                genericName: data.genericName,
                dosage: variant.dosage || '',
                duration: variant.duration || '5 Days',
                instructions: variant.instructions || '',
                timings: variant.timings || '',
                type: variant.type || 'Tablet',
                drawings: [],
            };
            addItem('prescriptions', newItem);
        }
        setIsPrescriptionEditModalVisible(false);
    }, [addItem, editingItem, setIsPrescriptionEditModalVisible, updateItem]);

    const handleClearInput = useCallback(() => {
        setWritingText('');
        setCurrentInputStrokes([]);
    }, [setCurrentInputStrokes, setWritingText]);

    return {
        addToCurrentSection,
        handleEditRow,
        handleAddNewProperty,
        handleEditProperty,
        handleDeleteProperty,
        handleEditCurrentInput,
        saveEditModal,
        savePrescriptionEdit,
        handleClearInput,
    };
}
