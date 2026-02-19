import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Icon } from '@/components/ui/Icon';
import { PATIENT_ICONS } from '@/constants/icons';
import type { Patient, User, VisitHistory } from '@/entities';
import type { ConsultationDetailSection } from '@/features/patient-detail/hooks/useVisitConsultationDetails';
import { AuthRepository } from '@/repositories';
import { PdfService } from '@/services/pdf-service';

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
    const [doctor, setDoctor] = useState<User | null>(null);

    useEffect(() => {
        if (!visible) return;
        let isCancelled = false;

        const loadDoctor = async () => {
            try {
                const user = await AuthRepository.restoreSession();
                if (!isCancelled) {
                    setDoctor(user);
                }
            } catch {
                if (!isCancelled) {
                    setDoctor(null);
                }
            }
        };

        void loadDoctor();

        return () => {
            isCancelled = true;
        };
    }, [visible]);

    const previewHtml = useMemo(() => {
        if (!patient || sections.length === 0) return '';

        const followUpSection = sections.find((section) => section.key === 'follow_up_date');
        const followUpDate = followUpSection?.rows?.[0]?.text;

        const pdfSections = sections
            .filter((section) => section.key !== 'follow_up_date')
            .map((section) => ({
                id: section.key,
                title: section.title,
                items: section.rows.map((row) => ({
                    name: row.name || row.text || '',
                    dosage: row.dosage,
                    duration: row.duration,
                    notes: row.notes,
                    instructions: row.instructions,
                    timings: row.timings,
                    drawings: row.drawings,
                    height: row.height,
                    isPrescription: section.key === 'prescriptions',
                })),
            }))
            .filter((section) => section.items.length > 0);

        const previewDoctor: User = doctor || {
            first_name: '',
            last_name: '',
            email: '',
        };

        return PdfService.generateHtml({
            patient,
            doctor: previewDoctor,
            sections: pdfSections,
            followUpDate,
            date: visit?.date || new Date().toLocaleDateString('en-GB'),
        } as any, { includeHeaderFooter: false });
    }, [doctor, patient, sections, visit?.date]);

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

                <View className="flex-1 px-6 pt-4 pb-4">
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

                    <View className="flex-1 mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {isLoading ? (
                            <View className="items-center justify-center py-16 flex-1">
                                <ActivityIndicator size="large" color="#007AFF" />
                                <Text className="text-gray-500 mt-4 text-[18px]">Loading consultation details...</Text>
                            </View>
                        ) : previewHtml ? (
                            Platform.OS === 'web' ? (
                                <iframe
                                    srcDoc={previewHtml}
                                    style={{ border: 'none', width: '100%', height: '100%' }}
                                />
                            ) : (
                                <WebView
                                    originWhitelist={['*']}
                                    source={{ html: previewHtml }}
                                    scalesPageToFit
                                    startInLoadingState
                                    containerStyle={{ flex: 1 }}
                                    style={{ flex: 1 }}
                                />
                            )
                        ) : errorMessage ? (
                            <View className="items-center justify-center py-16 flex-1">
                                <Text className="text-gray-500 text-center text-[18px]">
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : (
                            <View className="items-center justify-center py-16 flex-1">
                                <Text className="text-gray-500 text-center text-[18px]">
                                    No consultation details available for this visit.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
