import React from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    Alert,
} from 'react-native';
import { EDIT_PROFILE_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import PdfViewer from '@/components/pdf-viewer';
import { Asset } from '@/entities';
import { decryptAssetUrl } from '@/shared';

interface AssetGalleryModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    assets: Asset[];
    onUpload?: () => void;
    isLoading?: boolean;
    showCaptureButton?: boolean;
}

const SecureImage = ({ asset, style, decryptFn }: { asset: Asset, style: any, decryptFn: (asset: Asset) => Promise<string | null> }) => {
    const [uri, setUri] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (asset.url.startsWith('http')) {
                const decrypted = await decryptAssetUrl(asset.url);
                if (isMounted) {
                    setUri(decrypted);
                    setLoading(false);
                }
            } else {
                if (isMounted) {
                    setUri(asset.url);
                    setLoading(false);
                }
            }
        };
        load();
        return () => { isMounted = false; };
    }, [asset.url]);

    if (loading) {
        return <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}><ActivityIndicator size="small" /></View>;
    }

    if (!uri) {
        // Fallback or error
        return <View style={style} />;
    }

    return <Image source={{ uri }} style={style} />;
};

export function AssetGalleryModal({
    visible,
    onClose,
    title,
    assets,
    onUpload,
    isLoading,
    showCaptureButton = true
}: AssetGalleryModalProps) {
    const isWeb = Platform.OS === 'web';
    const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
    const [isFullScreen, setIsFullScreen] = React.useState(false);

    // Group assets by date
    const sections = React.useMemo(() => {
        const groups: { [key: string]: Asset[] } = {};
        assets.forEach(asset => {
            if (!groups[asset.date]) {
                groups[asset.date] = [];
            }
            groups[asset.date].push(asset);
        });

        const result = Object.keys(groups).map(date => ({
            title: date,
            data: groups[date]
        }));

        return result.sort((a, b) => {
            // Basic date comparison (assuming DD-MM-YYYY or similar string). 
            // Best to rely on source order if possible, or parse dates.
            // For now reverse if needed or keep as is.
            return 0;
        });
    }, [assets]);






    const [isSelecting, setIsSelecting] = React.useState(false);
    const [selectedForComparison, setSelectedForComparison] = React.useState<Asset[]>([]);
    const [isComparisonVisible, setIsComparisonVisible] = React.useState(false);

    const handleCompare = () => {
        if (isSelecting) {
            // "Done" action
            if (selectedForComparison.length === 2) {
                setIsComparisonVisible(true);
            } else {
                Alert.alert('Selection Incomplete', 'Please select exactly 2 images to compare.');
            }
        } else {
            // Start Selection
            setIsSelecting(true);
            setSelectedForComparison([]);
        }
    };

    const handleCancelSelection = () => {
        setIsSelecting(false);
        setSelectedForComparison([]);
    };

    const toggleSelection = (asset: Asset) => {
        if (selectedForComparison.find(a => a.id === asset.id)) {
            setSelectedForComparison(prev => prev.filter(a => a.id !== asset.id));
        } else {
            if (selectedForComparison.length >= 2) {
                Alert.alert('Limit Reached', 'You can only select 2 images for comparison.');
                return;
            }
            setSelectedForComparison(prev => [...prev, asset]);
        }
    };

    const [isDecryptingAsset, setIsDecryptingAsset] = React.useState(false);

    // ... (existing code)

    const handleAssetPress = async (asset: Asset) => {
        if (isSelecting) {
            if (asset.type === 'image') {
                toggleSelection(asset);
            } else {
                Alert.alert('Invalid Selection', 'Only images can be compared.');
            }
            return;
        }

        setIsFullScreen(true);
        setSelectedAsset(asset);

        if (asset.url.startsWith('http')) {
            setIsDecryptingAsset(true);
            const decryptedUri = await decryptAssetUrl(asset.url);
            setIsDecryptingAsset(false);
            if (decryptedUri) {
                setSelectedAsset(prev => prev ? { ...prev, url: decryptedUri } : null);
            }
        }
    };

    // ... (existing code)

    const renderFullScreenViewer = () => {
        if (!selectedAsset || !isFullScreen) return null;

        return (
            <Modal visible={true} transparent={false} animationType="fade" onRequestClose={() => setIsFullScreen(false)}>
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setIsFullScreen(false)}>
                        <Icon icon={EDIT_PROFILE_ICONS.close} size={30} color="white" />
                    </TouchableOpacity>

                    {isDecryptingAsset ? (
                        <ActivityIndicator size="large" color="white" />
                    ) : (
                        <>
                            {selectedAsset.type === 'image' ? (
                                <Image
                                    source={{ uri: selectedAsset.url }}
                                    style={styles.fullScreenImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={{ flex: 1, width: '100%' }}>
                                    <PdfViewer uri={selectedAsset.url} title={selectedAsset.label || "Report"} />
                                </View>
                            )}

                            {selectedAsset.type === 'image' && (
                                <View style={styles.fullScreenLabelContainer}>
                                    <Text style={styles.fullScreenLabel}>{selectedAsset.label || 'Image'} - {selectedAsset.date}</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </Modal>
        );
    }

    const renderComparisonViewer = () => {
        if (!isComparisonVisible || selectedForComparison.length !== 2) return null;

        const [asset1, asset2] = selectedForComparison;

        return (
            <Modal visible={true} transparent={false} animationType="slide" onRequestClose={() => setIsComparisonVisible(false)}>
                <View style={[styles.fullScreenContainer, { backgroundColor: '#000' }]}>
                    {/* Comparison Header */}
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 20, paddingBottom: 10,
                        backgroundColor: 'rgba(0,0,0,0.5)'
                    }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Comparison</Text>
                        <TouchableOpacity onPress={() => setIsComparisonVisible(false)}>
                            <Icon icon={EDIT_PROFILE_ICONS.close} size={28} color="white" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, width: '100%', flexDirection: 'column', paddingTop: 80, paddingBottom: 20 }}>
                        <View style={{ flex: 1, width: '100%', borderBottomWidth: 1, borderColor: '#333' }}>
                            <SecureImage asset={asset1} style={{ flex: 1, width: '100%', height: '100%' }} decryptFn={decryptAssetUrl as any} />
                            <Text style={styles.compareLabel}>{asset1.date}</Text>
                        </View>
                        <View style={{ flex: 1, width: '100%', borderTopWidth: 1, borderColor: '#333' }}>
                            <SecureImage asset={asset2} style={{ flex: 1, width: '100%', height: '100%' }} decryptFn={decryptAssetUrl as any} />
                            <Text style={styles.compareLabel}>{asset2.date}</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, isWeb ? styles.webContainer : styles.nativeContainer]}>

                    {/* Header - Blue Background as per screenshot */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleCompare} style={styles.headerButtonLeft}>
                            <Text style={[styles.headerButtonText, isSelecting && { fontWeight: 'bold' }]}>
                                {isSelecting ? 'Done' : 'Compare'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>
                            {isSelecting ? `${selectedForComparison.length} Selected` : title}
                        </Text>

                        <TouchableOpacity onPress={isSelecting ? handleCancelSelection : onClose} style={styles.headerButtonRight}>
                            {isSelecting ? (
                                <Text style={styles.headerButtonText}>Cancel</Text>
                            ) : (
                                <Icon icon={EDIT_PROFILE_ICONS.close} size={24} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.centerContent}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : (
                        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            {/* 1. Capture Section (Always visible if enabled) */}
                            {showCaptureButton && (
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                                    <View style={styles.gridContainer}>
                                        <TouchableOpacity onPress={onUpload} style={styles.captureCard}>
                                            <Icon library="Ionicons" ios="camera" android="camera" size={40} color="#007AFF" />
                                            <Text style={styles.captureText}>Capture Photo</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* 2. Empty State (only if no assets) */}
                            {assets.length === 0 && (
                                <View style={styles.sectionContainer}>
                                    {/* If capture button is hidden, show empty text */}
                                    {!showCaptureButton && (
                                        <View style={styles.centerContent}>
                                            <Text style={{ color: '#8E8E93', padding: 20 }}>No items found.</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {sections.map((section, sectionIndex) => (
                                <View key={section.title} style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                    <View style={styles.gridContainer}>
                                        {section.data.map((asset) => (
                                            <TouchableOpacity
                                                key={asset.id}
                                                style={styles.assetCard}
                                                onPress={() => handleAssetPress(asset)}
                                            >
                                                {asset.type === 'image' ? (
                                                    <View>
                                                        <SecureImage asset={asset} style={styles.thumbnailImage} decryptFn={decryptAssetUrl as any} />
                                                        {isSelecting && (
                                                            <View style={styles.selectionOverlay}>
                                                                <View style={[
                                                                    styles.selectionCircle,
                                                                    selectedForComparison.find(a => a.id === asset.id) && styles.selectionCircleSelected
                                                                ]}>
                                                                    {selectedForComparison.find(a => a.id === asset.id) && (
                                                                        <Icon library="Ionicons" android="checkmark" ios="checkmark" size={16} color="white" />
                                                                    )}
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>
                                                ) : (
                                                    <View style={styles.pdfThumbnail}>
                                                        <Icon library="MaterialCommunityIcons" android="file-pdf-box" ios="doc.richtext" size={40} color="#FF3B30" />
                                                    </View>
                                                )}
                                                <View style={styles.filenameContainer}>
                                                    <Text style={styles.filenameText} numberOfLines={2}>
                                                        {asset.label || 'image.jpg'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </View>
            </View>
            {renderFullScreenViewer()}
            {renderComparisonViewer()}
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#F2F2F7', // iOS System Gray 6
        borderRadius: 12,
        overflow: 'hidden',
        width: '90%',
        maxWidth: 700, // Adjusted width to look more like the screenshot (iPad form sheet)
        height: '80%', // Adjusted height
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    webContainer: {
        maxWidth: 800,
        height: '80%',
    },
    nativeContainer: {
        height: '80%',
    },
    header: {
        backgroundColor: '#007AFF', // Blue header
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 50,
    },
    headerTitle: {
        color: 'white',
        fontSize: 17, // Standard iOS title size
        fontWeight: '600',
    },
    headerButtonLeft: {
        minWidth: 60,
    },
    headerButtonRight: {
        minWidth: 30,
        alignItems: 'flex-end',
    },
    headerButtonText: {
        color: 'white',
        fontSize: 16,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flex: 1,
        padding: 20, // More padding as per screenshot
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 10,
        marginLeft: 4,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
    },
    // Cards
    captureCard: {
        width: 110,
        height: 110,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: { elevation: 2 }
        })
    },
    captureText: {
        marginTop: 8,
        color: '#007AFF',
        fontWeight: '600',
        fontSize: 11,
        textAlign: 'center',
    },
    assetCard: {
        width: 110,
        margin: 8,
        alignItems: 'center',
    },
    thumbnailImage: {
        width: 110,
        height: 110,
        borderRadius: 8,
        backgroundColor: '#E5E5EA',
    },
    pdfThumbnail: {
        width: 110,
        height: 110,
        borderRadius: 8,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    filenameContainer: {
        marginTop: 6,
        width: '100%',
        paddingHorizontal: 2,
        backgroundColor: '#F9FAFB', // Slight background for label as in screenshot
        borderRadius: 4,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    filenameText: {
        fontSize: 10,
        color: '#3C3C43',
        textAlign: 'center',
    },
    // Full Screen Viewer
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    fullScreenLabelContainer: {
        position: 'absolute',
        bottom: 40,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    fullScreenLabel: {
        color: 'white',
        fontSize: 14,
    },
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 8,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 8,
    },
    selectionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionCircleSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    compareLabel: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        overflow: 'hidden',
    }
});
