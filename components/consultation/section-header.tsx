import { SECTION_HEADER_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface SectionHeaderProps {
    title: string;
    onClear: () => void;
}

export default function SectionHeader({ title, onClear }: SectionHeaderProps) {
    return (
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#F2F2F7] border-b border-gray-200">
            <Text className="text-black font-bold text-base">{title}</Text>
            <TouchableOpacity onPress={onClear}>
                <Icon icon={SECTION_HEADER_ICONS.trashOutline} size={20} color="#FF3B30" />
            </TouchableOpacity>
        </View>
    );
}
