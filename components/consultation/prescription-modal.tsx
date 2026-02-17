import { PRESCRIPTION_MODAL_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import PrescriptionEditModal from './prescription-edit-modal';

// Re-export from centralized entity types for backward compatibility
export type { PrescriptionVariant, PrescriptionData } from '@/entities/consultation/types';
import type { PrescriptionVariant, PrescriptionData } from '@/entities/consultation/types';

interface PrescriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: PrescriptionData) => void;
    initialData?: PrescriptionData;
}

const DEFAULT_VARIANT: PrescriptionVariant = {
    id: '1',
    timings: 'M-A-O-O',
    dosage: 'N/A',
    duration: '15 Days',
    type: '',
};

export default function PrescriptionModal({
    visible,
    onClose,
    onSave,
    initialData,
}: PrescriptionModalProps) {
    const [brandName, setBrandName] = useState('');
    const [genericName, setGenericName] = useState('');
    const [variants, setVariants] = useState<PrescriptionVariant[]>([DEFAULT_VARIANT]);

    // Detail/Edit Modal State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingVariant, setEditingVariant] = useState<PrescriptionVariant | null>(null);

    useEffect(() => {
        if (initialData) {
            setBrandName(initialData.brandName || '');
            setGenericName(initialData.genericName || '');
            setVariants(initialData.variants?.length > 0 ? initialData.variants : [{ ...DEFAULT_VARIANT, id: Date.now().toString() }]);
        } else {
            setBrandName('');
            setGenericName('');
            setVariants([{ ...DEFAULT_VARIANT, id: Date.now().toString() }]);
        }
    }, [initialData, visible]);

    const handleMainSave = () => {
        onSave({
            brandName,
            genericName,
            variants,
        });
    };

    // --- Sub-Modal Handlers ---

    const handleAddVariant = () => {
        // Prepare empty/"new" data for the detail modal
        setEditingVariant(null); // null tells the sub-modal it's a new entry
        setIsEditModalVisible(true);
    };

    const handleEditVariant = (variant: PrescriptionVariant) => {
        setEditingVariant(variant);
        setIsEditModalVisible(true);
    };

    const handleDetailSave = (data: PrescriptionData) => {
        // The detailed modal returns a single variant in the `variants` array (index 0)
        const incomingVariant = data.variants[0];

        // Ensure we capture brand/generic names if they changed in the detail view
        setBrandName(data.brandName);
        setGenericName(data.genericName);

        if (editingVariant) {
            // We were editing an existing variant, so update it in the list
            setVariants(prev => prev.map(v => v.id === incomingVariant.id ? incomingVariant : v));
        } else {
            // We were adding a new one
            setVariants(prev => [...prev, incomingVariant]);
        }

        setIsEditModalVisible(false);
        setEditingVariant(null);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-black/50 justify-center items-center p-5">
                <View className="w-full max-w-3xl h-[80%] bg-white rounded-2xl overflow-hidden shadow-lg">
                    {/* Header */}
                    <View className="h-16 bg-white border-b border-gray-100 flex-row items-center justify-between px-4">
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Icon icon={PRESCRIPTION_MODAL_ICONS.close} size={28} color="#007AFF" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-black">Prescription</Text>
                        <View className="flex-row items-center gap-2">
                            {/* Add Button triggers the DETAIL modal for a new item */}
                            <TouchableOpacity onPress={handleAddVariant} className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                <Icon icon={PRESCRIPTION_MODAL_ICONS.add} size={20} color="#007AFF" />
                                <Text className="ml-1 text-[#007AFF] font-medium">Add</Text>
                            </TouchableOpacity>

                            {/* Save Button for the whole prescription transaction */}
                            <TouchableOpacity onPress={handleMainSave} className="bg-[#007AFF] px-4 py-2 rounded-lg">
                                <Text className="text-white font-semibold">Save All</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
                        {/* Fields (ReadOnly or Editable?) - Let's keep them editable at top level too */}
                        <View className="mb-6">
                            <View className="flex-row items-center mb-3">
                                <Text className="w-28 text-base font-semibold text-gray-700">Brand Name</Text>
                                <TextInput
                                    className="flex-1 h-11 border border-gray-200 rounded-lg px-3 bg-gray-50"
                                    value={brandName}
                                    onChangeText={setBrandName}
                                    placeholder="Enter brand name"
                                />
                            </View>
                            <View className="flex-row items-center mb-3">
                                <Text className="w-28 text-base font-semibold text-gray-700">Generic Name</Text>
                                <TextInput
                                    className="flex-1 h-11 border border-gray-200 rounded-lg px-3 bg-gray-50"
                                    value={genericName}
                                    onChangeText={setGenericName}
                                    placeholder="Enter generic name"
                                />
                            </View>
                        </View>

                        {/* Variants Table Header */}
                        <View className="flex-row py-2 border-b border-gray-200 mb-2 bg-gray-50 px-2 rounded-t-lg">
                            <Text className="w-10 text-[10px] font-bold text-gray-500 uppercase">S. No.</Text>
                            <Text className="flex-[2] text-[10px] font-bold text-gray-500 uppercase">Timings</Text>
                            <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase">Dosage</Text>
                            <Text className="flex-[1.5] text-[10px] font-bold text-gray-500 uppercase">Duration</Text>
                            <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase">Type</Text>
                            <View className="w-16" />
                        </View>

                        {/* Variants List */}
                        {variants.map((variant, index) => (
                            <View key={variant.id} className="flex-row items-center py-3 border-b border-gray-100 px-2">
                                <Text className="w-10 text-sm text-black">{index + 1}</Text>

                                <Text className="flex-[2] text-sm text-black">{variant.timings}</Text>
                                <Text className="flex-1 text-sm text-black">{variant.dosage}</Text>
                                <Text className="flex-[1.5] text-sm text-black">{variant.duration}</Text>
                                <Text className="flex-1 text-sm text-black">{variant.type}</Text>

                                <View className="flex-row items-center w-16 justify-end gap-2">
                                    <TouchableOpacity onPress={() => handleEditVariant(variant)}>
                                        <Icon icon={PRESCRIPTION_MODAL_ICONS.createOutline} size={20} color="#007AFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => {
                                        setVariants(prev => prev.filter(v => v.id !== variant.id));
                                    }}>
                                        <Icon icon={PRESCRIPTION_MODAL_ICONS.trashOutline} size={20} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {variants.length === 0 && (
                            <View className="py-8 items-center justify-center">
                                <Text className="text-gray-400">No details added yet.</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </SafeAreaView>

            {/* Nested Detail Modal for Adding/Editing Variants */}
            <PrescriptionEditModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleDetailSave}
                initialData={{
                    brandName,
                    genericName,
                    variants: editingVariant ? [editingVariant] : [] // Pass single variant to edit or empty
                }}
            />
        </Modal>
    );
}
