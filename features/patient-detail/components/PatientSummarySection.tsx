import React from 'react';
import { Text, View } from 'react-native';

interface PatientSummarySectionProps {
    summary: string;
}

const PatientSummarySection = ({ summary }: PatientSummarySectionProps) => (
    <View className="px-6 mb-8">
        <Text className="text-lg font-bold text-gray-900 mb-3">Patient summary</Text>
        <View className="bg-gray-50/50 rounded-xl p-0">
            {summary ? (
                <Text className="text-gray-700 text-[14px] leading-[22px]">
                    {summary}
                </Text>
            ) : (
                <Text className="text-gray-400 italic text-[14px] leading-[22px]">
                    No clinical summary available yet.
                </Text>
            )}
        </View>
    </View>
);

export default PatientSummarySection;
