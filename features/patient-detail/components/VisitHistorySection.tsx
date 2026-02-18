import React from 'react';
import { FlatList, Platform, Text, View } from 'react-native';
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
    const isWeb = Platform.OS === 'web';
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
        <View style={isWeb ? { paddingHorizontal: 12 } : { flex: 1, paddingHorizontal: 12 }}>
            <View className={`flex-row items-center justify-between ${isWeb ? 'mb-2' : 'mb-3'}`}>
                <Text className={`${isWeb ? 'text-base' : 'text-lg'} font-bold text-gray-900`}>
                    Previous Visits
                </Text>
            </View>

            {history.length > 0 ? (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: isWeb ? 10 : 20 }}
                    scrollEnabled={!isWeb}
                />
            ) : (
                <View className={`flex-1 items-center justify-center ${isWeb ? 'py-5' : 'py-10'}`}>
                    <Icon icon={PATIENT_ICONS.account} size={isWeb ? 36 : 48} color="#D1D5DB" />
                    <Text className={`text-gray-400 italic ${isWeb ? 'mt-2' : 'mt-3'}`}>
                        No previous visits found
                    </Text>
                </View>
            )}
        </View>
    );
};

export default VisitHistorySection;
