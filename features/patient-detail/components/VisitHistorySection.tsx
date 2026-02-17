import React from 'react';
import { Text, View, FlatList } from 'react-native';
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
}: VisitHistorySectionProps) => {
    const renderItem = ({ item, index }: { item: VisitHistory; index: number }) => (
        <VisitHistoryItem
            visit={item}
            isLast={index === history.length - 1}
            onView={onOpenVisit}
            onPrint={onPrintPDF}
            onShare={onSharePDF}
        />
    );

    return (
        <View className="flex-1 px-3">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-gray-900">
                    Previous Visits
                </Text>
            </View>

            {history.length > 0 ? (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            ) : (
                <View className="flex-1 items-center justify-center py-10">
                    <Icon icon={PATIENT_ICONS.account} size={48} color="#D1D5DB" />
                    <Text className="text-gray-400 italic mt-3">
                        No previous visits found
                    </Text>
                </View>
            )}
        </View>
    );
};

export default VisitHistorySection;
