import { PDF_FILTER_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, Switch, Pressable, Platform } from 'react-native';

export interface FilterSection {
    id: string;
    label: string;
    enabled: boolean;
}

interface PdfFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onGenerate: (sections: string[]) => void;
    initialSections: FilterSection[];
}

export default function PdfFilterModal({
    visible,
    onClose,
    onGenerate,
    initialSections,
}: PdfFilterModalProps) {
    const [sections, setSections] = useState<FilterSection[]>(initialSections);
    const [showPatientDetails, setShowPatientDetails] = useState(true);
    const [showDoctorDetails, setShowDoctorDetails] = useState(true);
    const [showHeaderSection, setShowHeaderSection] = useState(true);
    const [showFooterSection, setShowFooterSection] = useState(true);

    // Keep internal state in sync with props
    React.useEffect(() => {
        setSections(initialSections);
    }, [initialSections]);

    const toggleSection = (id: string) => {
        setSections(prev =>
            prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
        );
    };

    const handleApply = () => {
        const enabledIds = sections.filter(s => s.enabled).map(s => s.id);
        onGenerate(enabledIds);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/40 flex-row justify-end"
            >
                {/* Popover Content */}
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className="w-[280px] h-auto bg-white mt-24 mb-auto mr-4 rounded-xl shadow-2xl overflow-hidden"
                >
                    <View className="p-4">
                        <ScrollView showsVerticalScrollIndicator={false} className="max-h-[70vh]">
                            {/* Meta Sections with Switches */}
                            <View className="mb-2">
                                <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
                                    <Text className="text-[17px] text-gray-800">Patient Details</Text>
                                    <Switch
                                        value={showPatientDetails}
                                        onValueChange={setShowPatientDetails}
                                        trackColor={{ false: '#f0f0f0', true: '#34C759' }}
                                        thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
                                    />
                                </View>
                                <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
                                    <Text className="text-[17px] text-gray-800">Doctor Details</Text>
                                    <Switch
                                        value={showDoctorDetails}
                                        onValueChange={setShowDoctorDetails}
                                        trackColor={{ false: '#f0f0f0', true: '#34C759' }}
                                    />
                                </View>
                                <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
                                    <Text className="text-[17px] text-gray-800">Header Section</Text>
                                    <Switch
                                        value={showHeaderSection}
                                        onValueChange={setShowHeaderSection}
                                        trackColor={{ false: '#f0f0f0', true: '#34C759' }}
                                    />
                                </View>
                                <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                                    <Text className="text-[17px] text-gray-800">Footer Section</Text>
                                    <Switch
                                        value={showFooterSection}
                                        onValueChange={setShowFooterSection}
                                        trackColor={{ false: '#f0f0f0', true: '#34C759' }}
                                    />
                                </View>
                            </View>

                            {/* List of sections with Radio Buttons */}
                            <View className="mt-2">
                                {sections.map((section) => (
                                    <TouchableOpacity
                                        key={section.id}
                                        onPress={() => toggleSection(section.id)}
                                        className="flex-row items-center py-2"
                                        activeOpacity={0.7}
                                    >
                                        <View className="mr-3">
                                            <Icon
                                                icon={section.enabled ? PDF_FILTER_ICONS.checkCircle : PDF_FILTER_ICONS.radioUnchecked}
                                                size={22}
                                                color="#007AFF"
                                            />
                                        </View>
                                        <Text className={`text-[17px] ${section.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {section.label === 'Instructions' ? 'Instruction' : section.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Apply Button */}
                        <TouchableOpacity
                            onPress={handleApply}
                            className="bg-[#007AFF] mt-4 py-3.5 rounded-xl items-center shadow-lg shadow-blue-200"
                        >
                            <Text className="text-white font-bold text-[17px]">Update Report</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
