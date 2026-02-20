import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
} from 'react-native';
import { EDIT_PROFILE_ICONS, VISIT_HISTORY_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import PdfViewer from '@/components/pdf-viewer';
import { AuthRepository, PatientRepository } from '@/repositories';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/endpoints';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import { VisitHistory } from '@/entities';
import { mapPdfHistory, mapConsultationHistory, fetchAndDecryptFile } from '@/shared';
import { buildConsultationSections, ConsultationDetailSection } from '@/shared/lib/consultation-mapper';
import {
    buildRawPayloadMap,
    extractConsultations,
    extractPdfHistory,
    mergeVisitHistory,
} from './visit-history-modal.utils';

interface VisitHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    patientId: string;
}



export function VisitHistoryModal({ visible, onClose, patientId }: VisitHistoryModalProps) {
    const isWeb = Platform.OS === 'web';
    const [isLoading, setIsLoading] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [history, setHistory] = useState<VisitHistory[]>([]);
    const [selectedVisit, setSelectedVisit] = useState<VisitHistory | null>(null);
    const [decryptedPdfUri, setDecryptedPdfUri] = useState<string | null>(null);
    const [decryptedBytes, setDecryptedBytes] = useState<Uint8Array | null>(null);
    const rawPayloadsRef = useRef<Map<string, any>>(new Map());
    const [sections, setSections] = useState<ConsultationDetailSection[]>([]);

    const handleVisitSelect = useCallback(async (visit: VisitHistory) => {
        setSelectedVisit(visit);
        setIsDecrypting(true);
        setDecryptedPdfUri(null);
        setDecryptedBytes(null);

        let hasSectionFallback = false;
        try {
            // Native Preview Logic: If we have the raw consultation data, build sections
            const visitId = visit.consultationID || visit.id;
            const payload = rawPayloadsRef.current.get(visitId);
            if (payload) {
                const mappedSections = buildConsultationSections(payload);
                hasSectionFallback = mappedSections.length > 0;
                setSections(mappedSections);
            } else {
                setSections([]);
            }

            // Still fetch and decrypt PDF for Share/Print functionality
            let pdfPath = '';
            if (visit.name) {
                pdfPath = API_ENDPOINTS.CONSULTATION.PDF_DOWNLOAD(visit.name);
            } else if (visit.link) {
                pdfPath = visit.link.startsWith('/') ? visit.link : `/${visit.link}`;
            }

            if (!pdfPath) throw new Error('Invalid report link');

            const fullUrl = `${API_BASE_URL}${pdfPath}`;
            const result = await fetchAndDecryptFile(fullUrl);
            if (result) {
                if (isWeb) {
                    const blobUrl = URL.createObjectURL(result.blob!);
                    setDecryptedPdfUri(blobUrl);
                } else {
                    const fileName = `Report_${visit.id}.pdf`;
                    const file = new File(Paths.cache, fileName);
                    file.write(result.bytes);

                    setDecryptedPdfUri(file.uri);
                    console.log('Android PDF URI:', file.uri);

                }
                setDecryptedBytes(result.bytes);
            }
        } catch (error: any) {
            if (__DEV__) console.error('Decryption failed:', error);
            // Don't alert if we have sections to show as a fallback
            if (!hasSectionFallback) {
                Alert.alert('Error', error.message || 'Failed to decrypt the report.');
            }
        } finally {
            setIsDecrypting(false);
        }
    }, [isWeb]);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            await AuthRepository.restoreSession();

            const historyData = await PatientRepository.getPatientHistory(patientId);
            const consultations = extractConsultations(historyData);
            const latestConsultation = consultations[0];
            const fromConsultations = mapConsultationHistory(consultations);
            const pdfHist = extractPdfHistory(historyData, latestConsultation);
            const fromPdfs = mapPdfHistory(pdfHist);
            const finalHistory = mergeVisitHistory(fromConsultations, fromPdfs);

            // Store raw payloads for native preview
            rawPayloadsRef.current = buildRawPayloadMap(consultations);

            setHistory(finalHistory);
            if (finalHistory.length > 0) {
                void handleVisitSelect(finalHistory[0]);
            }
        } catch (error) {
            if (__DEV__) console.error('Failed to load history:', error);
            Alert.alert('Error', 'Could not fetch visit history.');
        } finally {
            setIsLoading(false);
        }
    }, [handleVisitSelect, patientId]);

    useEffect(() => {
        if (visible && patientId) {
            void loadHistory();
        } else if (!visible) {
            setDecryptedPdfUri(null);
            setDecryptedBytes(null);
            setSelectedVisit(null);
        }
    }, [loadHistory, patientId, visible]);



    const handlePrint = async () => {
        if (!decryptedPdfUri) return;
        try {
            await Print.printAsync({ uri: decryptedPdfUri });
        } catch (error: any) {
            if (error.message?.includes('cancelled')) return;
            Alert.alert('Error', 'Print failed');
        }
    };

    const handleShare = async () => {
        if (!decryptedPdfUri || !decryptedBytes) return;
        try {
            if (isWeb) {
                window.open(decryptedPdfUri, '_blank');
            } else {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(decryptedPdfUri, {
                        mimeType: 'application/pdf',
                        UTI: 'com.adobe.pdf'
                    });
                }
            }
        } catch {
            Alert.alert('Error', 'Share failed');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={[styles.modalContainer, isWeb ? styles.webContainer : styles.nativeContainer]}
                >

                    {/* Left Side: PDF Preview (Premium Native feel) */}
                    <View style={styles.leftPane}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Icon icon={EDIT_PROFILE_ICONS.close} size={24} color="#007AFF" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText}>Consultation</Text>
                        </View>

                        <View style={styles.previewContent}>
                            {isDecrypting ? (
                                <View style={styles.centerContent}>
                                    <ActivityIndicator size="large" color="#007AFF" />
                                    <Text style={styles.loadingText}>Loading PDF...</Text>
                                </View>
                            ) : decryptedPdfUri ? (
                                <View style={styles.pdfContainer}>
                                    <PdfViewer uri={decryptedPdfUri} title="Consultation Report" />
                                </View>
                            ) : sections.length > 0 ? (
                                <View style={styles.pdfContainer}>
                                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                        <View style={{ padding: 20 }}>
                                            {sections.map((section) => (
                                                <View key={section.key} style={{ marginBottom: 25 }}>
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                                                        {section.title}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            ) : (
                                <View style={styles.centerContent}>
                                    <Icon icon={VISIT_HISTORY_ICONS.document} size={80} color="#E5E7EB" />
                                    <Text style={styles.placeholderText}>
                                        Select a visit history to view
                                    </Text>
                                </View>
                            )}

                        </View>
                    </View>

                    {/* Right Side: History List (Matches Swift 250pt width) */}
                    <View style={styles.rightPane}>
                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {isLoading ? (
                                <View style={styles.listLoading}>
                                    <ActivityIndicator size="small" color="#007AFF" />
                                </View>
                            ) : history.length > 0 ? (
                                history.map((visit) => {
                                    const isSelected = selectedVisit?.id === visit.id;
                                    return (
                                        <View key={visit.id} style={[styles.visitItem, isSelected && styles.selectedVisitItem]}>
                                            <TouchableOpacity
                                                onPress={() => handleVisitSelect(visit)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.visitDate,
                                                    isSelected ? styles.selectedDate : styles.unselectedDate
                                                ]}>
                                                    {visit.date}
                                                </Text>
                                            </TouchableOpacity>

                                            {isSelected && !isDecrypting && (
                                                <View style={styles.actionRow}>
                                                    <TouchableOpacity onPress={handlePrint} style={styles.actionButton}>
                                                        <View style={styles.actionIconContainer}>
                                                            <Icon icon={VISIT_HISTORY_ICONS.printer} size={20} color="#007AFF" />
                                                        </View>
                                                        <Text style={styles.actionLabel}>Print</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                                                        <View style={styles.actionIconContainer}>
                                                            <Icon icon={VISIT_HISTORY_ICONS.share} size={20} color="#007AFF" />
                                                        </View>
                                                        <Text style={styles.actionLabel}>Share</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No previous consultations</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        flexDirection: 'row',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 15,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    webContainer: {
        maxWidth: 1100,
        height: '85%',
    },
    nativeContainer: {
        height: '92%',
    },
    leftPane: {
        flex: 1, // Takes all remaining space
        backgroundColor: '#F3F4F6',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        position: 'relative',
    },
    rightPane: {
        width: 250, // Matches Swift Storyboard precisely
        backgroundColor: '#FFFFFF',
        paddingVertical: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
    },
    titleContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    titleText: {
        color: '#1F2937',
        fontWeight: '700',
        fontSize: 19,
    },
    previewContent: {
        flex: 1,
        padding: 24,
        paddingTop: 70,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#6B7280',
        marginTop: 16,
        fontWeight: '500',
    },
    pdfContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        // Essential for iPad Premium feel
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
        }),
    },
    placeholderText: {
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 16,
    },
    visitItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
    },
    selectedVisitItem: {
        backgroundColor: '#F9FAFB',
    },
    visitDate: {
        textAlign: 'left',
        fontSize: 14,
    },
    selectedDate: {
        color: '#007AFF', // Matches Swift systemBlue
        fontWeight: '600',
    },
    unselectedDate: {
        color: '#6B7280',
        fontWeight: '400',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 16,
        marginTop: 12,
    },
    actionButton: {
        alignItems: 'center',
    },
    actionIconContainer: {
        padding: 8,
        backgroundColor: 'rgba(0,122,255,0.08)',
        borderRadius: 10,
    },
    actionLabel: {
        fontSize: 9,
        color: '#007AFF',
        marginTop: 4,
        fontWeight: '600',
    },
    listLoading: {
        marginTop: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 80,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        color: '#9CA3AF',
        textAlign: 'center',
        fontSize: 14,
    },
});
