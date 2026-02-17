import React from 'react';
import { Text, View } from 'react-native';
import type { SettingSection } from '@/features/settings/types';

interface ComingSoonSectionProps {
    section: SettingSection;
}

const ComingSoonSection = ({ section }: ComingSoonSectionProps) => (
    <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500 text-lg">{section} content coming soon...</Text>
    </View>
);

export default ComingSoonSection;
