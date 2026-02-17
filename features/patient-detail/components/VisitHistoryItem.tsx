import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { PATIENT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { VisitHistory } from '@/entities';

interface VisitHistoryItemProps {
    visit: VisitHistory;
    isLast: boolean;
    onView: (visit: VisitHistory) => void;
    onPrint: (visit: VisitHistory) => void;
    onShare: (visit: VisitHistory) => void;
}

const VisitHistoryItem = ({
    visit,
    isLast,
    onView,
    onPrint,
    onShare,
}: VisitHistoryItemProps) => (
    <TouchableOpacity
        onPress={() => onView(visit)}
        activeOpacity={0.7}
        className={`flex-row items-center py-2 px-1 ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
        <View className="w-9 h-9 rounded-lg bg-blue-50 items-center justify-center mr-2">
            <Text className="text-xl font-serif italic font-bold text-[#007AFF]">℞</Text>
        </View>

        <View className="flex-1">
            <Text className="text-gray-900 text-[15px] font-medium">{visit.date}</Text>
        </View>

        <View className="flex-row items-center gap-2">
            <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onPrint(visit); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Icon icon={PATIENT_ICONS.printer} size={22} color="#007AFF" />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onShare(visit); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Icon icon={PATIENT_ICONS.exportVariant} size={22} color="#007AFF" />
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
);

export default VisitHistoryItem;
