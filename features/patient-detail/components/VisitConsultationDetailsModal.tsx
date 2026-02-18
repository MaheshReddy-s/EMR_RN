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

                                    {section.rows.map((row, index) => {
                                        const isPrescription = section.key === 'prescriptions';
                                        const hasDrawings = row.drawings && row.drawings.length > 0;

                                        // Calculate height from drawings if available to prevent cutting
                                        let calculatedMinHeight = (row.height || 32);

                                        if (hasDrawings) {
                                            // Simple heuristic: find max Y in logical coords and convert to screen
                                            // This ensures even if metadata height is lost, we show the full drawing
                                            let maxY = 0;
                                            row.drawings.forEach(s => {
                                                const matches = s.svg.match(/([ML])(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g);
                                                if (matches) {
                                                    matches.forEach(m => {
                                                        const parts = m.trim().split(/\s+/);
                                                        const y = parseFloat(parts[parts.length - 1]);
                                                        if (y > maxY) maxY = y;
                                                    });
                                                }
                                            });

                                            // Convert logical Y (0-820) back to screen Y (relative to 720 container)
                                            const screenMaxY = (maxY * 720 / 820) + 6; // Removed bottom padding cushion
                                            calculatedMinHeight = Math.max(calculatedMinHeight, screenMaxY);
                                        }

                                        return (
                                            <View
                                                key={`${section.key}-${index}`}
                                                className="border-b border-gray-100 relative"
                                                style={{ minHeight: calculatedMinHeight }}
                                            >
                                                {/* Text Layer */}
                                                <View className=" z-20">
                                                    <View className="flex-row items-start">
                                                        {isPrescription && row.name ? (
                                                            <>
                                                                <View className="flex-1">
                                                                    {/* Row 1: Name - Timings - Duration */}
                                                                    <View style={{ height: 25, position: 'relative', width: '100%' }}>
                                                                        {isPrescription && (
                                                                            <Text
                                                                                style={{ position: 'absolute', left: 4, top: 1, width: 20 }}
                                                                                className="text-gray-500 font-bold text-[13.5px]"
                                                                            >
                                                                                {index + 1}.
                                                                            </Text>
                                                                        )}
                                                                        <Text
                                                                            style={{ position: 'absolute', left: 28, top: 1, right: '45%' }}
                                                                            className="text-gray-900 font-bold text-[13.5px]"
                                                                            numberOfLines={1}
                                                                        >
                                                                            {row.name}
                                                                        </Text>
                                                                        <View style={{ position: 'absolute', left: '43%', top: 1, width: '33%' }}>
                                                                            <Text className="text-gray-700 font-bold text-[13.5px] text-left" numberOfLines={1}>
                                                                                {row.timings}
                                                                            </Text>
                                                                        </View>
                                                                        <Text
                                                                            style={{ position: 'absolute', right: 10, top: 1 }}
                                                                            className="text-gray-900 font-bold text-[13.2px] text-right"
                                                                            numberOfLines={1}
                                                                        >
                                                                            {row.duration}
                                                                        </Text>
                                                                    </View>

                                                                    {/* Row 2: Dosage - Instructions */}
                                                                    {(row.dosage || row.instructions) && (
                                                                        <View style={{ height: 20, marginTop: 1, position: 'relative', width: '100%' }}>
                                                                            <Text
                                                                                style={{ position: 'absolute', left: 10, top: 0, width: '40%' }}
                                                                                className="text-gray-900 text-[13.5px]"
                                                                                numberOfLines={1}
                                                                            >
                                                                                {row.dosage}
                                                                            </Text>
                                                                            <Text
                                                                                style={{ position: 'absolute', left: '43%', top: 0, right: 10 }}
                                                                                className="text-gray-900 text-[13.5px] italic"
                                                                                numberOfLines={1}
                                                                            >
                                                                                {row.instructions}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </>
                                                        ) : (
                                                            <View className="flex-1">
                                                                <View style={{ minHeight: 22, justifyContent: 'center' }}>
                                                                    <Text
                                                                        className="text-[#495057] text-[13.5px]"
                                                                        style={{ paddingLeft: 10, fontWeight: '400' }}
                                                                        numberOfLines={2}
                                                                    >
                                                                        {row.name || row.text}
                                                                    </Text>
                                                                </View>
                                                                {row.notes ? (
                                                                    <View style={{ paddingLeft: 10, marginTop: 2 }}>
                                                                        <Text className="text-[#6c757d] text-[13.5px]">
                                                                            {row.notes}
                                                                        </Text>
                                                                    </View>
                                                                ) : null}
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>

                                                {/* Drawing Layer - Absolute overlay to match consultation screen */}
                                                {hasDrawings && (
                                                    <View
                                                        className="absolute top-0 left-0 right-0 bottom-0 z-10"
                                                        pointerEvents="none"
                                                    >
                                                        <DrawingCanvas
                                                            initialDrawings={row.drawings}
                                                            canvasOnly={true}
                                                            penColor="#5d271aff"
                                                            penThickness={1.5}
                                                            isErasing={false}
                                                            style={{ height: '100%' }}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
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
