import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';
import { CONSULTATION_SETTINGS_DATA } from '@/features/settings/constants';

interface ConsultationSettingsSectionProps {
    settings: Record<string, boolean>;
    onToggle: (id: string) => void;
    onProfilePress: () => void;
    onLogoutPress: () => void;
}

const ConsultationSettingsSection = ({
    settings,
    onToggle,
    onProfilePress,
    onLogoutPress,
}: ConsultationSettingsSectionProps) => (
    <View className="flex-1 bg-white p-6">
        <SettingsSectionHeader
            title="Settings"
            onProfilePress={onProfilePress}
            onLogoutPress={onLogoutPress}
        />

        <Text className="text-gray-800 font-medium mb-6">
            Note : <Text className="font-normal">Changes made in the Page will effect for All Consultations</Text>
        </Text>

        <ScrollView className="flex-1 border border-gray-200 rounded-xl">
            {CONSULTATION_SETTINGS_DATA.map((item, index) => (
                <View key={item.id} className={`flex-row items-center justify-between p-4 ${index !== CONSULTATION_SETTINGS_DATA.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <Text className="text-base text-gray-800 font-medium">{item.label}</Text>
                    <Switch
                        trackColor={{ false: '#767577', true: '#3B82F6' }}
                        thumbColor="#f4f3f4"
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={() => onToggle(item.id)}
                        value={settings[item.id]}
                    />
                </View>
            ))}
        </ScrollView>
    </View>
);

export default ConsultationSettingsSection;
