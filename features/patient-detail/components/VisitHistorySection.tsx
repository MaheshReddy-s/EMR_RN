import React from 'react';
import { Text, View } from 'react-native';
import { PATIENT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { VisitHistory } from '@/entities';
import VisitHistoryItem from '@/features/patient-detail/components/VisitHistoryItem';

interface VisitHistorySectionProps {
    history: VisitHistory[];
    onOpenVisit: (visit: VisitHistory) => void;
    onPrintPDF: (visit: VisitHistory) => void;
    onSharePDF: (visit: VisitHistory) => void;
}

const VisitHistorySection = ({
    history,
    onOpenVisit,
    onPrintPDF,
    onSharePDF,
}: VisitHistorySectionProps) => (
    <View className="px-3 pb-5">
        <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900">Previous Visits</Text>
            {history.length > 0 && (
                <Text className="text-[13px] text-gray-400">{history.length} visit{history.length !== 1 ? 's' : ''}</Text>
            )}
        </View>

        {history.length > 0 ? (
            history.map((visit, index) => (
                <VisitHistoryItem
                    key={visit.id}
                    visit={visit}
                    isLast={index === history.length - 1}
                    onView={onOpenVisit}
                    onPrint={onPrintPDF}
                    onShare={onSharePDF}
                />
            ))
        ) : (
            <View className="py-10 items-center">
                <Icon icon={PATIENT_ICONS.account} size={48} color="#D1D5DB" />
                <Text className="text-gray-400 italic mt-3">No previous visits found</Text>
            </View>
        )}
    </View>
);

export default VisitHistorySection;
