import React from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';
import type { AdvancedSettings } from '@/features/settings/types';

export interface AdvancedSettingsComponentProps {
    settings: AdvancedSettings;
    onChange: (key: keyof AdvancedSettings, value: any) => void;
    onSave: () => Promise<void>;
    isDirty: boolean;
    isSaving: boolean;
}

interface Props extends AdvancedSettingsComponentProps {
    onProfilePress: () => void;
    onLogoutPress: () => void;
}

const AdvancedSettingsSection = ({
    settings,
    onChange,
    onSave,
    isDirty,
    isSaving,
    onProfilePress,
    onLogoutPress,
}: Props) => {
    const renderInput = (label: string, key: keyof AdvancedSettings, defaultValue: string) => (
        <View className="mb-6">
            <Text className="text-sm font-medium text-gray-600 mb-2">{label}</Text>
            <TextInput
                className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                value={String(settings[key] ?? defaultValue)}
                onChangeText={(text) => {
                    const val = text === '' ? 0 : Number(text);
                    if (!isNaN(val)) onChange(key, val);
                }}
                keyboardType="numeric"
            />
        </View>
    );

    return (
        <View className="flex-1 bg-white p-8">
            <SettingsSectionHeader
                title="Settings"
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
                absoluteActions
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="flex-row mb-12">
                    <View className="w-48 pt-2">
                        <Text className="text-lg font-bold text-gray-900">Pencil</Text>
                    </View>
                    <View className="flex-1 max-w-2xl">
                        <View className="flex-row items-center mb-6">
                            <Text className="text-gray-600 w-32">Pencil thickness</Text>
                            <View className="flex-1 h-1 bg-gray-200 mx-4 relative">
                                <View
                                    className="absolute top-[-6] w-4 h-4 rounded-full bg-white shadow border border-gray-200"
                                    style={{ left: `${(settings.pencil_thickness / 5) * 100}%` }}
                                />
                            </View>
                            <TextInput
                                className="w-12 p-1 border border-gray-200 rounded text-center text-gray-900 font-medium ml-2"
                                value={String(settings.pencil_thickness)}
                                onChangeText={(text) => {
                                    const val = Number(text);
                                    if (!isNaN(val) && val >= 0 && val <= 5) onChange('pencil_thickness', val);
                                }}
                                keyboardType="numeric"
                            />
                        </View>
                        <View className="h-48 w-full bg-gray-50 rounded-lg border border-gray-100 items-center justify-center">
                            <View
                                style={{
                                    width: 100,
                                    height: settings.pencil_thickness * 2,
                                    backgroundColor: '#3B82F6',
                                    borderRadius: settings.pencil_thickness
                                }}
                            />
                            <Text className="mt-4 text-xs text-gray-400">Pencil Preview</Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row mb-12">
                    <View className="w-48 pt-2">
                        <Text className="text-lg font-bold text-gray-900">Spacing</Text>
                    </View>
                    <View className="flex-1 max-w-md">
                        {renderInput('Top Space', 'top_space', '110')}
                        {renderInput('Bottom Space', 'bottom_space', '30')}
                        {renderInput('Left Space', 'left_space', '70')}
                        {renderInput('Right Space', 'right_space', '70')}
                    </View>
                </View>

                <View className="flex-row mb-12">
                    <View className="w-48 pt-3">
                        <Text className="text-base font-bold text-gray-900">Followup Window (Days)</Text>
                    </View>
                    <View className="flex-1 max-w-md">
                        {renderInput('Window size', 'followup_window', '0')}
                    </View>
                </View>

                <View className="flex-row mb-12">
                    <View className="w-48 pt-3">
                        <Text className="text-base font-bold text-gray-900">Slot Duration (Min)</Text>
                    </View>
                    <View className="flex-1 max-w-md">
                        {renderInput('Duration', 'slot_duration', '15')}
                    </View>
                </View>

                <View className="items-end mt-4 mb-20 pr-4">
                    <TouchableOpacity
                        onPress={onSave}
                        disabled={!isDirty || isSaving}
                        className={`px-8 py-3 rounded-lg border ${!isDirty || isSaving
                                ? 'bg-gray-50 border-gray-200 opacity-50'
                                : 'bg-white border-blue-500 active:bg-blue-50'
                            }`}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                            <Text className={`${!isDirty ? 'text-gray-400' : 'text-blue-600'} font-bold`}>
                                {isDirty ? 'Update Settings' : 'Saved'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default AdvancedSettingsSection;
