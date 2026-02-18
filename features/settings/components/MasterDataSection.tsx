import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SETTINGS_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import { DataEditModal } from '@/components/settings/DataEditModal';
import PrescriptionModal from '@/components/consultation/prescription-modal';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';
import type { MasterDataItem } from '@/repositories';
import type { SettingSection } from '@/features/settings/types';

interface MasterDataSectionProps {
    activeSection: SettingSection;
    items: MasterDataItem[];
    isLoading: boolean;
    isModalVisible: boolean;
    modalTitle: string;
    editingItem: MasterDataItem | null;
    onProfilePress: () => void;
    onLogoutPress: () => void;
    onOpenAddModal: () => void;
    onOpenEditModal: (item: MasterDataItem) => void;
    onCloseModal: () => void;
    onSaveItem: (value: string | any) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
    onDeleteAll: () => Promise<void>;
    onRefresh: () => Promise<void>;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    isPrescriptionModalVisible?: boolean;
    currentPrescriptionData?: any;
}

const MasterDataSection = ({
    activeSection,
    items,
    isLoading,
    isModalVisible,
    modalTitle,
    editingItem,
    onProfilePress,
    onLogoutPress,
    onOpenAddModal,
    onOpenEditModal,
    onCloseModal,
    onSaveItem,
    onDeleteItem,
    onDeleteAll,
    onRefresh,
    searchQuery,
    onSearchQueryChange,
    isPrescriptionModalVisible,
    currentPrescriptionData,
}: MasterDataSectionProps) => (
    <View className="flex-1 bg-white p-6">
        <SettingsSectionHeader
            title="Settings"
            onProfilePress={onProfilePress}
            onLogoutPress={onLogoutPress}
        />

        <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity onPress={onOpenAddModal} className="flex-row items-center">
                <Icon icon={SETTINGS_ICONS.addCircleOutline} size={20} color="#3B82F6" />
                <Text className="ml-2 text-blue-500 font-medium text-base">Add {activeSection}</Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-4 flex-1 justify-end">
                <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-1.5 flex-1 max-w-[200px]">
                    <Icon icon={SETTINGS_ICONS.search} size={18} color="#9CA3AF" />
                    <TextInput
                        className="ml-2 flex-1 text-sm text-gray-800 p-0"
                        placeholder="Search..."
                        value={searchQuery}
                        onChangeText={onSearchQueryChange}
                    />
                </View>
                <TouchableOpacity onPress={onDeleteAll} className="flex-row items-center">
                    <Icon icon={SETTINGS_ICONS.deleteOutline} size={20} color="#EF4444" />
                    <Text className="ml-1 text-red-500 font-medium">Delete All</Text>
                </TouchableOpacity>
            </View>
        </View>

        {isLoading ? (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        ) : (
            <ScrollView
                className="flex-1 border border-gray-200 rounded-xl"
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            >
                {items.length === 0 ? (
                    <View className="p-8 items-center">
                        <Text className="text-gray-400">No items found</Text>
                    </View>
                ) : (
                    items.map((item, index) => (
                        <View key={item._id} className={`flex-row items-center justify-between p-4 ${index !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <Text className="text-base text-gray-800 flex-1">{item.name}</Text>
                            <View className="flex-row items-center gap-4">
                                <TouchableOpacity className="items-center" onPress={() => onOpenEditModal(item)}>
                                    <Icon icon={SETTINGS_ICONS.edit} size={18} color="#6B7280" />
                                    <Text className="text-[10px] text-gray-500 mt-1">Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="items-center" onPress={() => onDeleteItem(item._id)}>
                                    <Icon icon={SETTINGS_ICONS.close} size={18} color="#6B7280" />
                                    <Text className="text-[10px] text-gray-500 mt-1">Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        )}

        <DataEditModal
            visible={isModalVisible}
            title={modalTitle}
            initialValue={editingItem?.name}
            onClose={onCloseModal}
            onSave={onSaveItem}
        />

        <PrescriptionModal
            visible={isPrescriptionModalVisible || false}
            onClose={onCloseModal}
            onSave={onSaveItem}
            initialData={currentPrescriptionData}
        />
    </View>
);

export default MasterDataSection;
