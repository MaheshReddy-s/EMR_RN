import React from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';

interface AdvancedSettingsSectionProps {
    onProfilePress: () => void;
    onLogoutPress: () => void;
}

const AdvancedSettingsSection = ({
    onProfilePress,
    onLogoutPress,
}: AdvancedSettingsSectionProps) => (
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
                            <View className="absolute top-[-6] left-[20%] w-4 h-4 rounded-full bg-white shadow border border-gray-200" />
                        </View>
                        <Text className="text-gray-900 font-medium ml-2">1</Text>
                    </View>
                    <View className="h-48 w-full bg-gray-50 rounded-lg border border-gray-100" />
                </View>
            </View>

            <View className="flex-row mb-12">
                <View className="w-48 pt-2">
                    <Text className="text-lg font-bold text-gray-900">Spacing</Text>
                </View>
                <View className="flex-1 max-w-md">
                    <View className="mb-6">
                        <Text className="text-sm font-medium text-gray-600 mb-2">Top Space</Text>
                        <TextInput
                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                            defaultValue="110"
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="mb-6">
                        <Text className="text-sm font-medium text-gray-600 mb-2">Bottom Space</Text>
                        <TextInput
                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                            defaultValue="30"
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="mb-6">
                        <Text className="text-sm font-medium text-gray-600 mb-2">Left Space</Text>
                        <TextInput
                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                            defaultValue="70"
                            keyboardType="numeric"
                        />
                    </View>
                </View>
            </View>

            <View className="flex-row mb-12">
                <View className="w-48 pt-2">
                    <Text className="text-lg font-bold text-gray-900">Scale</Text>
                </View>
                <View className="flex-1 max-w-md flex-row items-center">
                    <View className="flex-1 h-1 bg-blue-500 mx-4 relative">
                        <View className="absolute top-[-8] right-0 w-6 h-6 rounded-full bg-white shadow border border-gray-200" />
                    </View>
                    <Text className="ml-4 font-medium text-gray-900">1.0</Text>
                </View>
            </View>

            <View className="flex-row mb-12">
                <View className="w-48 pt-3">
                    <Text className="text-base font-bold text-gray-900">Followup Window</Text>
                </View>
                <View className="flex-1 max-w-md">
                    <TextInput
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                        defaultValue="0"
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <View className="items-end mt-4 mb-20 pr-4">
                <TouchableOpacity
                    onPress={() => Alert.alert('Configuration Saved', 'Settings updated successfully.')}
                    className="px-8 py-3 bg-white border border-gray-300 rounded-lg active:bg-gray-50"
                >
                    <Text className="text-gray-600 font-medium">Update</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </View>
);

export default AdvancedSettingsSection;
