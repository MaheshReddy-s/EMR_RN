import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { TouchableOpacity } from 'react-native-gesture-handler';
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
        <TouchableOpacity
            onLongPress={drag}
            delayLongPress={120}
            disabled={isActive}
            activeOpacity={0.9}
        >
            <View
                style={[styles.row, isActive ? styles.rowActive : styles.rowIdle]}
            >
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity onLongPress={drag} delayLongPress={120} hitSlop={8} activeOpacity={0.7}>
                        <Icon icon={SETTINGS_ICONS.dragHandle} size={24} color="#9CA3AF" />
                    </TouchableOpacity>
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
        </TouchableOpacity>
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
                    activationDistance={8}
                    containerStyle={{ flex: 1 }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    rowIdle: {
        backgroundColor: '#FFFFFF',
    },
    rowActive: {
        backgroundColor: '#EFF6FF',
        zIndex: 10,
    },
});

export default SectionsOrderSection;
