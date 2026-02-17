import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SETTINGS_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import { SIDEBAR_ITEMS } from '@/features/settings/constants';
import type { SettingSection } from '@/features/settings/types';

interface SettingsSidebarProps {
    activeSection: SettingSection;
    onSectionChange: (section: SettingSection) => void;
    onClose: () => void;
    topInset: number;
}

const SidebarItem = ({
    section,
    label,
    activeSection,
    onSectionChange,
}: {
    section: SettingSection;
    label: string;
    activeSection: SettingSection;
    onSectionChange: (section: SettingSection) => void;
}) => (
    <TouchableOpacity
        onPress={() => onSectionChange(section)}
        className={`py-4 px-6 border-b border-gray-100 flex-row items-center justify-between ${activeSection === section ? 'bg-blue-50 border-r-4 border-r-blue-500' : 'bg-white'}`}
    >
        <Text className={`text-base ${activeSection === section ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
            {label}
        </Text>
        {activeSection === section && (
            <Icon icon={SETTINGS_ICONS.chevronRight} size={20} color="#3B82F6" />
        )}
    </TouchableOpacity>
);

const SettingsSidebar = ({
    activeSection,
    onSectionChange,
    onClose,
    topInset,
}: SettingsSidebarProps) => (
    <View className="w-80 border-r border-gray-200 bg-white flex flex-col" style={{ paddingTop: topInset }}>
        <View className="p-4 border-b border-gray-100">
            <TouchableOpacity
                onPress={onClose}
                className="flex-row items-center px-3 py-2 border border-gray-200 rounded-lg self-start"
            >
                <Icon icon={SETTINGS_ICONS.close} size={16} color="#4B5563" />
                <Text className="ml-2 text-gray-600 text-sm font-medium">Close</Text>
            </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
            {SIDEBAR_ITEMS.map((item) => (
                <SidebarItem
                    key={item.section}
                    section={item.section}
                    label={item.label}
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                />
            ))}
        </ScrollView>
    </View>
);

export default SettingsSidebar;
