import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

type TabType = 'complaints' | 'diagnosis' | 'examination' | 'investigation' | 'procedure' | 'prescriptions' | 'instruction' | 'notes';

interface ConsultationTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const tabs: { key: TabType; label: string }[] = [
    { key: 'instruction', label: 'Instruction' },
    { key: 'procedure', label: 'Procedure' },
    { key: 'prescriptions', label: 'Prescriptions' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'examination', label: 'Examination' },
    { key: 'notes', label: 'Notes' },
    { key: 'complaints', label: 'Complaints' },
    { key: 'diagnosis', label: 'Diagnosis' },
];

export default function ConsultationTabs({ activeTab, onTabChange }: ConsultationTabsProps) {
    const { width } = useWindowDimensions();
    const tabWidth = width / 4;

    return (
        <View className="bg-white border-b border-gray-200">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={{ alignItems: 'center' }}
            >
                {tabs.map((tab, index) => (
                    <View key={tab.key} style={{ width: tabWidth, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => onTabChange(tab.key)}
                            style={{ flex: 1 }}
                            className={`py-3.5 items-center border-b-[3px] ${activeTab === tab.key
                                ? 'border-[#007AFF]'
                                : 'border-transparent'
                                }`}
                        >
                            <Text
                                numberOfLines={1}
                                className={`text-[13px] ${activeTab === tab.key
                                    ? 'text-black font-bold'
                                    : 'text-gray-500 font-medium'
                                    }`}
                            >
                                {tab.label.toUpperCase()}
                            </Text>
                        </TouchableOpacity>

                        {/* Vertical Separator (except after the last item in a page or absolute last) */}
                        {index !== tabs.length - 1 && (index + 1) % 4 !== 0 && (
                            <View style={{ width: 1, height: 20, backgroundColor: '#E5E7EB' }} />
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

export type { TabType };
