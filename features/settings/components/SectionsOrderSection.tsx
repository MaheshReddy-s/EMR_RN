import React from 'react';
import { Switch, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { SETTINGS_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';
import type { ListItem } from '@/features/settings/types';

interface SectionsOrderSectionProps {
    sectionsOrder: ListItem[];
    onSectionsOrderChange: (next: ListItem[]) => void;
    onToggleSection: (key: string) => void;
    onProfilePress: () => void;
    onLogoutPress: () => void;
}

const SectionsOrderSection = ({
    sectionsOrder,
    onSectionsOrderChange,
    onToggleSection,
    onProfilePress,
    onLogoutPress,
}: SectionsOrderSectionProps) => {
    const renderSectionItem = ({ item, drag, isActive }: RenderItemParams<ListItem>) => (
        <GHTouchableOpacity onLongPress={drag} disabled={isActive}>
            <View
                style={{ backgroundColor: isActive ? '#EFF6FF' : 'white' }}
                className={`flex-row items-center justify-between p-4 border-b border-gray-100 ${isActive ? 'shadow-sm z-10' : ''}`}
            >
                <View className="flex-row items-center flex-1">
                    <GHTouchableOpacity onPressIn={drag}>
                        <Icon icon={SETTINGS_ICONS.dragHandle} size={24} color="#9CA3AF" />
                    </GHTouchableOpacity>
                    <Text
                        className={`text-base font-medium ml-3 ${item.enabled ? 'text-gray-700' : 'text-gray-400'}`}
                    >
                        {item.label}
                    </Text>
                </View>

                <Switch
                    value={item.enabled}
                    onValueChange={() => onToggleSection(item.key)}
                    trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                    thumbColor={item.enabled ? '#FFFFFF' : '#F9FAFB'}
                />
            </View>
        </GHTouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white p-6">
            <SettingsSectionHeader
                title="Sections"
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
            />

            <Text className="text-gray-500 mb-4 italic">
                Drag items to reorder sections. Toggle to enable/disable.
            </Text>

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
