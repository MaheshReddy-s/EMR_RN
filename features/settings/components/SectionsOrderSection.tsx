import React from 'react';
import { Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { TouchableOpacity } from 'react-native';
import { SETTINGS_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';
import type { ListItem } from '@/features/settings/types';

interface SectionsOrderSectionProps {
    sectionsOrder: ListItem[];
    onSectionsOrderChange: (next: ListItem[]) => void;
    onProfilePress: () => void;
    onLogoutPress: () => void;
}

const SectionsOrderSection = ({
    sectionsOrder,
    onSectionsOrderChange,
    onProfilePress,
    onLogoutPress,
}: SectionsOrderSectionProps) => {
    const renderSectionItem = ({ item, drag, isActive }: RenderItemParams<ListItem>) => (
        <TouchableOpacity onLongPress={drag} disabled={isActive}>
            <View
                style={{ backgroundColor: isActive ? '#EFF6FF' : 'white' }}
                className={`flex-row items-center justify-between p-4 border-b border-gray-100 ${isActive ? 'shadow-sm z-10' : ''}`}
            >
                <Text className="text-base font-medium text-gray-700">{item.label}</Text>
                <TouchableOpacity onPressIn={drag}>
                    <Icon icon={SETTINGS_ICONS.dragHandle} size={24} color="#9CA3AF" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white p-6">
            <SettingsSectionHeader
                title="Sections"
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
            />

            <Text className="text-gray-500 mb-4 italic">Drag items to reorder sections.</Text>

            <View className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <DraggableFlatList
                    data={sectionsOrder}
                    onDragEnd={({ data }) => onSectionsOrderChange(data)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSectionItem}
                    containerStyle={{ flex: 1 }}
                />
            </View>
        </View>
    );
};

export default SectionsOrderSection;
