import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SETTINGS_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface SettingsSectionHeaderProps {
    title: string;
    onProfilePress: () => void;
    onLogoutPress: () => void;
    absoluteActions?: boolean;
}

const SettingsSectionHeader = ({
    title,
    onProfilePress,
    onLogoutPress,
    absoluteActions = false,
}: SettingsSectionHeaderProps) => (
    <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-800">{title}</Text>
        <View className={`flex-row gap-3 ${absoluteActions ? 'absolute right-0' : ''}`}>
            <TouchableOpacity onPress={onProfilePress} className="flex-row items-center px-4 py-2 border border-gray-300 rounded-lg">
                <Icon icon={SETTINGS_ICONS.personOutline} size={18} color="#4B5563" />
                <Text className="ml-2 text-gray-600">Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onLogoutPress} className="flex-row items-center px-4 py-2 border border-gray-300 rounded-lg">
                <Icon icon={SETTINGS_ICONS.logout} size={18} color="#4B5563" />
                <Text className="ml-2 text-gray-600">Logout</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default SettingsSectionHeader;
