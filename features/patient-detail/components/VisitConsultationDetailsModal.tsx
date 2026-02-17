import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PATIENT_ICONS } from '@/constants/icons';
import type { Patient, VisitHistory } from '@/entities';
import type { ConsultationDetailSection } from '@/features/patient-detail/hooks/useVisitConsultationDetails';
import DrawingCanvas from '@/components/consultation/drawing-canvas';

interface VisitConsultationDetailsModalProps {
    visible: boolean;
    patient: Patient | null;
    visit: VisitHistory | null;
    sections: ConsultationDetailSection[];
    isLoading: boolean;
    errorMessage: string | null;
    onClose: () => void;
    onPrintPDF: (visit: VisitHistory) => void;
    onSharePDF: (visit: VisitHistory) => void;
}

const topPadding = Platform.OS === 'ios' ? 52 : 18;

export default function VisitConsultationDetailsModal({
    visible,
    patient,
    visit,
    sections,
    isLoading,
    errorMessage,
    onClose,
    onPrintPDF,
    onSharePDF,
}: VisitConsultationDetailsModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-white">
                <View className="px-4 pb-3 border-b border-gray-200" style={{ paddingTop: topPadding }}>
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={onClose}
                            className="flex-row items-center"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon icon={PATIENT_ICONS.chevronLeft} size={26} color="#007AFF" />
                            <Text className="text-[#007AFF] text-[21px] ml-1">Back</Text>
                        </TouchableOpacity>

                        <View className="flex-1 items-center px-2">
                            <Text className="text-gray-900 text-[19px] font-semibold text-center">
                                {visit?.date || 'Consultation'}
                            </Text>
                        </View>

                        <View style={{ width: 48 }} />
                    </View>
                </View>

                <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                    <View className="flex-row items-start justify-between">
                        <View className="flex-row items-start flex-1 pr-4">
                            <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mr-3">
                                <Icon icon={PATIENT_ICONS.account} size={42} color="#007AFF" />
                            </View>
                            <View>
                                <Text className="text-gray-900 text-[17px] font-medium">
                                    Name: {patient?.patient_name || 'N/A'}
                                </Text>
                                <Text className="text-gray-900 text-[17px] mt-0.5">
                                    Mobile: {patient?.patient_mobile || 'N/A'}
                                </Text>
                            </View>
                        </View>

                        <View>
                            <Text className="text-gray-900 text-[17px] text-right">
                                Age: {patient?.age ?? 'N/A'}
                            </Text>
                            <Text className="text-gray-900 text-[17px] mt-0.5 text-right">
                                Gender: {patient?.gender || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-center gap-4 mt-6">
                        <TouchableOpacity
                            disabled={!visit}
                            onPress={() => visit && onPrintPDF(visit)}
                            className="flex-row items-center px-3 py-1.5 rounded-lg border border-[#007AFF]"
                        >
                            <Icon icon={PATIENT_ICONS.printer} size={18} color="#007AFF" />
                            <Text className="text-[#007AFF] text-[18px] font-medium ml-2">Print</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            disabled={!visit}
                            onPress={() => visit && onSharePDF(visit)}
                            className="flex-row items-center px-3 py-1.5 rounded-lg border border-[#007AFF]"
                        >
                            <Icon icon={PATIENT_ICONS.exportVariant} size={18} color="#007AFF" />
                            <Text className="text-[#007AFF] text-[18px] font-medium ml-2">Share</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-[17px] font-bold text-gray-900 text-center mt-4">
                        Consultation Details
                    </Text>

                    {isLoading ? (
                        <View className="items-center justify-center py-16">
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text className="text-gray-500 mt-4 text-[18px]">Loading consultation details...</Text>
                        </View>
                    ) : (
                        <>
                            {sections.map((section) => (
                                <View key={section.key} className="mt-7">
                                    <Text className="text-gray-900 text-[17px] font-bold underline mb-2">
                                        {section.title}
                                    </Text>

                                    {section.rows.map((row, index) => (
                                        <View
                                            key={`${section.key}-${index}`}
                                            className="py-3 border-b border-gray-100"
                                        >
                                            {row.text ? (
                                                <Text className="text-gray-900 text-[17px] leading-6 mb-1">
                                                    {row.text}
                                                </Text>
                                            ) : null}

                                            {row.drawings && row.drawings.length > 0 ? (
                                                <View
                                                    style={{
                                                        height: row.height || 100,
                                                        width: '100%',
                                                        backgroundColor: '#f9f9f9',
                                                        borderRadius: 8,
                                                        marginTop: 4,
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <DrawingCanvas
                                                        initialDrawings={row.drawings}
                                                        canvasOnly={true}
                                                        penColor="#5d271aff"
                                                        penThickness={1.5}
                                                        isErasing={false}
                                                    />
                                                </View>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {errorMessage && sections.length === 0 ? (
                                <View className="py-16">
                                    <Text className="text-gray-500 text-center text-[18px]">
                                        {errorMessage}
                                    </Text>
                                </View>
                            ) : null}
                        </>
                    )}

                    <View className="h-10" />
                </ScrollView>
            </View>
        </Modal>
    );
}
