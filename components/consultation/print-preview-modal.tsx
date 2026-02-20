import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Icon } from '@/components/ui/Icon';
import { PRINT_PREVIEW_ICONS } from '@/constants/icons';
import { PdfService } from '@/services/pdf-service';
import PdfFilterModal, { PdfFilterRenderOptions } from './pdf-filter-modal';
import FollowupInfoModal, { FollowupInfoSelection } from './followup-info-modal';

interface PrintPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    onDone: (selection: FollowupInfoSelection) => void;
    onShowFilter: () => void; // This will now keep parent updated if needed
    onGenerateReport?: (sectionIds: string[], renderOptions: PdfFilterRenderOptions) => void;
    htmlContent: string;
    pdfData: any; // The data used to generate the HTML
}

export default function PrintPreviewModal({
    visible,
    onClose,
    onDone,
    onShowFilter,
    onGenerateReport,
    htmlContent,
    pdfData
}: PrintPreviewModalProps) {
    const [isPdfFilterVisible, setIsPdfFilterVisible] = useState(false);
    const [isFollowupInfoVisible, setIsFollowupInfoVisible] = useState(false);

    const handlePrint = async () => {
        try {
            if (Platform.OS === 'web') {
                await PdfService.createPdf(pdfData, pdfData?.__renderOptions);
            } else {
                // For native, we use expo-print to actually trigger the printer
                const Print = await import('expo-print');
                await Print.printAsync({ html: htmlContent });
            }
        } catch {
            Alert.alert('Print Error', 'Failed to initiate printing');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-gray-100">
                {/* iOS Native Header Replica */}
                <View className="bg-white border-b border-gray-200 pt-12 pb-4 px-4 flex-row items-center justify-between">
                    {/* Left: Back Action */}
                    <TouchableOpacity
                        onPress={onClose}
                        className="flex-row items-center px-3 py-1.5 rounded-lg border border-gray-300"
                    >
                        <Icon icon={PRINT_PREVIEW_ICONS.back} size={20} color="#007AFF" />
                        <Text className="text-[#007AFF] text-[16px] font-semibold ml-1.5">Back</Text>
                    </TouchableOpacity>

                    {/* Right: Actions */}
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity
                            onPress={handlePrint}
                            className="flex-row items-center px-3 py-1.5 rounded-lg border border-gray-300"
                        >
                            <Icon icon={PRINT_PREVIEW_ICONS.print} size={20} color="#007AFF" />
                            <Text className="text-[#007AFF] text-[16px] font-semibold ml-1.5">Print</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setIsFollowupInfoVisible(true)}
                            className="flex-row items-center px-3 py-1.5 rounded-lg border border-[#007AFF]"
                        >
                            <Icon icon={PRINT_PREVIEW_ICONS.done} size={20} color="#007AFF" />
                            <Text className="text-[#007AFF] text-[16px] font-bold ml-1.5">Done</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setIsPdfFilterVisible(true)}
                            className="ml-1 p-1"
                        >
                            <Icon icon={PRINT_PREVIEW_ICONS.filter} size={28} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Report Preview Surface */}
                <View className="flex-1 bg-gray-100 p-4">
                    <View className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {Platform.OS === 'web' ? (
                            <iframe
                                srcDoc={htmlContent}
                                style={{ border: 'none', width: '100%', height: '100%' }}
                            />
                        ) : (
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: htmlContent }}
                                scalesPageToFit={true}
                                startInLoadingState={true}
                                containerStyle={{ flex: 1 }}
                                style={{ flex: 1 }}
                            />
                        )}
                    </View>
                </View>

                {/* PDF Filter Modal - Now inside PrintPreview for correct layering */}
                <PdfFilterModal
                    visible={isPdfFilterVisible}
                    onClose={() => setIsPdfFilterVisible(false)}
                    onGenerate={({ sections, renderOptions }) => {
                        setIsPdfFilterVisible(false);
                        onShowFilter(); // This is now used to trigger re-generation in parent
                        onGenerateReport?.(sections, renderOptions);
                    }}
                    initialSections={(pdfData?.__availableSections || pdfData?.sections || []).map((s: any) => ({
                        id: s.id,
                        label: s.title,
                        enabled: Array.isArray(pdfData?.__selectedSectionIds)
                            ? pdfData.__selectedSectionIds.includes(s.id)
                            : true,
                    }))}
                    initialRenderOptions={pdfData?.__renderOptions}
                    allowedRenderOptions={pdfData?.__allowedRenderOptions}
                />

                <FollowupInfoModal
                    visible={isFollowupInfoVisible}
                    onClose={() => setIsFollowupInfoVisible(false)}
                    onSubmit={(selection) => {
                        setIsFollowupInfoVisible(false);
                        onDone(selection);
                    }}
                />
            </View>
        </Modal>
    );
}
