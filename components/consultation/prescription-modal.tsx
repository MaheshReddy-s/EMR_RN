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
    onApplyVariant: (variant: PrescriptionVariant, brandName: string, genericName: string) => void;
    initialData?: PrescriptionData;
}

const DEFAULT_VARIANT: PrescriptionVariant = {
    id: '1',
    timings: 'M-A-E-N',
    dosage: 'N/A',
    duration: '15 Days',
    type: 'Tablet',
};

export default function PrescriptionModal({
    visible,
    onClose,
    onApplyVariant,
    initialData,
}: PrescriptionModalProps) {
    const [brandName, setBrandName] = useState('');
    const [genericName, setGenericName] = useState('');
    const [variants, setVariants] = useState<PrescriptionVariant[]>([]);

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

    const handleSaveMain = () => {
        // This could be used for saving the master data changes if needed
        // For now, we'll just follow the "True icon adds variant" flow
    };

    // --- Sub-Modal Handlers ---

    const handleAddVariant = () => {
        setEditingVariant(null);
        setIsEditModalVisible(true);
    };

    const handleEditVariant = (variant: PrescriptionVariant) => {
        setEditingVariant(variant);
        setIsEditModalVisible(true);
    };

    const handleDetailSave = (data: PrescriptionData) => {
        const incomingVariant = data.variants[0];
        setBrandName(data.brandName);
        setGenericName(data.genericName);

        if (editingVariant) {
            setVariants(prev => prev.map(v => v.id === incomingVariant.id ? incomingVariant : v));
        } else {
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
            <View className="flex-1 bg-black/40 justify-center items-center p-4">
                <View className="w-full max-w-3xl h-[85%] bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* Header Controls */}
                    <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
                        <TouchableOpacity onPress={onClose} className="p-1">
                            <Icon icon={PRESCRIPTION_MODAL_ICONS.close} size={28} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleAddVariant} className="p-1">
                            <Icon icon={PRESCRIPTION_MODAL_ICONS.add} size={28} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    <View className="px-6 py-4">
                        {/* Brand & Generic Name Row */}
                        <View className="flex-row items-end gap-4 mb-6">
                            <View className="flex-1 gap-4">
                                <View className="flex-row items-center">
                                    <Text className="w-28 text-md font-bold text-black">Brand Name</Text>
                                    <TextInput
                                        className="flex-1 h-10 border border-gray-200 rounded px-3 text-md text-black bg-white"
                                        value={brandName}
                                        onChangeText={setBrandName}
                                    />
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="w-28 text-md font-bold text-black">Generic Name</Text>
                                    <TextInput
                                        className="flex-1 h-10 border border-gray-200 rounded px-3 text-md text-black bg-white"
                                        value={genericName}
                                        onChangeText={setGenericName}
                                    />
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={handleSaveMain}
                                className="bg-[#007AFF] px-6 py-2 rounded shadow-sm"
                            >
                                <Text className="text-white font-bold">Save</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Variants Table */}
                        <View className="flex-1 min-h-[400px]">
                            {/* Table Header */}
                            <View className="flex-row border-b border-gray-200 py-2 mb-2">
                                <Text className="w-12 text-md font-bold text-black">S. No.</Text>
                                <Text className="w-32 text-md font-bold text-black">Timings</Text>
                                <Text className="w-24 text-md font-bold text-black">Dosage</Text>
                                <Text className="w-40 text-md font-bold text-black">Duration</Text>
                                <Text className="flex-1 text-md font-bold text-black">Type</Text>
                                <View className="w-24" />
                            </View>

                            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                {variants.map((v, index) => (
                                    <View key={v.id} className="flex-row items-center py-3 border-b border-gray-50">
                                        <Text className="w-12 text-md text-black pl-2">{index + 1}</Text>
                                        <Text className="w-32 text-md text-black font-medium">{v.timings}</Text>
                                        <Text className="w-24 text-md text-black">{v.dosage || 'N/A'}</Text>
                                        <Text className="w-40 text-md text-black" numberOfLines={1}>
                                            {v.duration && /^\d+$/.test(v.duration.trim()) ? `${v.duration} Days` : (v.duration || 'N/A')}
                                        </Text>
                                        <Text className="flex-1 text-md text-black">{v.type || 'N/A'}</Text>

                                        <View className="flex-row items-center w-24 justify-end gap-3 px-2">
                                            <TouchableOpacity onPress={() => handleEditVariant(v)}>
                                                <Icon icon={PRESCRIPTION_MODAL_ICONS.editCircle} size={26} color="#007AFF" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => onApplyVariant(v, brandName, genericName)}>
                                                <Icon icon={PRESCRIPTION_MODAL_ICONS.checkmarkCircle} size={26} color="#007AFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                {variants.length === 0 && (
                                    <View className="py-20 items-center justify-center">
                                        <Text className="text-gray-400 italic text-base">No variants found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </View>

            <PrescriptionEditModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleDetailSave}
                initialData={{
                    brandName,
                    genericName,
                    variants: editingVariant ? [editingVariant] : []
                }}
            />
        </Modal>
    );
}
