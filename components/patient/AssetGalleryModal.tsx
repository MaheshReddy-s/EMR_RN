import React from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    Alert,
} from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

type ViewState = 'GALLERY' | 'FULL_SCREEN' | 'COMPARISON';

const SecureImage = ({ asset, style }: { asset: Asset, style: any }) => {
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

    if (!uri) return <View style={style} />;

    return <Image source={{ uri }} style={style} />;
};

const ZoomableSecureImage = ({ asset, style }: { asset: Asset, style: any }) => {
    const [uri, setUri] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.max(1, savedScale.value * e.scale);
        })
        .onEnd(() => {
            if (scale.value <= 1.1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .minPointers(1)
        .onUpdate((e) => {
            if (scale.value > 1) {
                const maxTranslateX = (scale.value - 1) * 200;
                const maxTranslateY = (scale.value - 1) * 300;

                let nextX = savedTranslateX.value + e.translationX;
                let nextY = savedTranslateY.value + e.translationY;

                translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, nextX));
                translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, nextY));
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1.1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withSpring(2.5);
                savedScale.value = 2.5;
            }
        });

    const composedGestures = Gesture.Simultaneous(
        doubleTapGesture,
        pinchGesture,
        panGesture
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ],
    }));

    React.useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
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
            } catch (e) {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => { isMounted = false; };
    }, [asset.url]);

    if (loading) {
        return <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}><ActivityIndicator size="small" color="white" /></View>;
    }

    if (!uri) return <View style={style} />;

    return (
        <GestureDetector gesture={composedGestures}>
            <Animated.View style={[style, { overflow: 'hidden' }]}>
                <Animated.Image
                    source={{ uri }}
                    style={[{ width: '100%', height: '100%' }, animatedStyle]}
                    resizeMode="contain"
                />
            </Animated.View>
        </GestureDetector>
    );
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
    const [viewState, setViewState] = React.useState<ViewState>('GALLERY');
    const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
    const [isSelecting, setIsSelecting] = React.useState(false);
    const [selectedForComparison, setSelectedForComparison] = React.useState<Asset[]>([]);
    const [isDecryptingAsset, setIsDecryptingAsset] = React.useState(false);

    const sections = React.useMemo(() => {
        const groups: { [key: string]: Asset[] } = {};
        assets.forEach(asset => {
            if (!groups[asset.date]) groups[asset.date] = [];
            groups[asset.date].push(asset);
        });
        return Object.keys(groups).map(date => ({ title: date, data: groups[date] }));
    }, [assets]);

    const handleCompare = () => {
        if (isSelecting) {
            if (selectedForComparison.length === 2) {
                setViewState('COMPARISON');
            } else {
                Alert.alert('Selection Incomplete', 'Please select exactly 2 images to compare.');
            }
        } else {
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

    const handleAssetPress = async (asset: Asset) => {
        if (isSelecting) {
            if (asset.type === 'image') toggleSelection(asset);
            else Alert.alert('Invalid Selection', 'Only images can be compared.');
            return;
        }

        setSelectedAsset(asset);
        setViewState('FULL_SCREEN');

        if (asset.url.startsWith('http')) {
            setIsDecryptingAsset(true);
            const decryptedUri = await decryptAssetUrl(asset.url);
            setIsDecryptingAsset(false);
            if (decryptedUri) {
                setSelectedAsset(prev => prev ? { ...prev, url: decryptedUri } : null);
            }
        }
    };

    const renderGallery = () => (
        <View style={[styles.modalContainer, isWeb ? styles.webContainer : styles.nativeContainer]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCompare} style={styles.headerButtonLeft}>
                    <Text style={[styles.headerButtonText, isSelecting && { fontWeight: 'bold' }]}>
                        {isSelecting ? 'Done' : 'Compare'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isSelecting ? `${selectedForComparison.length} Selected` : title}</Text>
                <TouchableOpacity onPress={isSelecting ? handleCancelSelection : onClose} style={styles.headerButtonRight}>
                    {isSelecting ? <Text style={styles.headerButtonText}>Cancel</Text> : <Icon icon={EDIT_PROFILE_ICONS.close} size={24} color="white" />}
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centerContent}><ActivityIndicator size="large" color="#007AFF" /></View>
            ) : (
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                    {assets.length === 0 && !showCaptureButton && (
                        <View style={styles.centerContent}><Text style={{ color: '#8E8E93', padding: 20 }}>No items found.</Text></View>
                    )}
                    {sections.map((section) => (
                        <View key={section.title} style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={styles.gridContainer}>
                                {section.data.map((asset) => (
                                    <TouchableOpacity key={asset.id} style={styles.assetCard} onPress={() => handleAssetPress(asset)}>
                                        {asset.type === 'image' ? (
                                            <View>
                                                <SecureImage asset={asset} style={styles.thumbnailImage} />
                                                {isSelecting && (
                                                    <View style={styles.selectionOverlay}>
                                                        <View style={[styles.selectionCircle, selectedForComparison.find(a => a.id === asset.id) && styles.selectionCircleSelected]}>
                                                            {selectedForComparison.find(a => a.id === asset.id) && <Icon library="Ionicons" android="checkmark" ios="checkmark" size={16} color="white" />}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <View style={styles.pdfThumbnail}><View style={{ backgroundColor: "#FF3B30", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}><Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>PDF</Text></View></View>
                                        )}
                                        <View style={styles.filenameContainer}><Text style={styles.filenameText} numberOfLines={2}>{asset.label || 'image.jpg'}</Text></View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );

    const renderFullScreen = () => (
        <View style={styles.fullScreenOverlay}>
            <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setViewState('GALLERY')}>
                <Icon icon={EDIT_PROFILE_ICONS.close} size={30} color="white" />
            </TouchableOpacity>
            {isDecryptingAsset ? (
                <ActivityIndicator size="large" color="white" />
            ) : selectedAsset && (
                <>
                    {selectedAsset.type === 'image' ? (
                        <ZoomableSecureImage asset={selectedAsset} style={styles.fullScreenImage} />
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
    );

    const renderComparison = () => {
        const [asset1, asset2] = selectedForComparison;
        return (
            <View style={styles.fullScreenOverlay}>
                <View style={styles.comparisonHeader}>
                    <Text style={styles.comparisonTitle}>Comparison</Text>
                    <TouchableOpacity onPress={() => setViewState('GALLERY')}>
                        <Icon icon={EDIT_PROFILE_ICONS.close} size={28} color="white" />
                    </TouchableOpacity>
                </View>
                <View style={styles.comparisonContent}>
                    <View style={styles.compareItem}>
                        <ZoomableSecureImage asset={asset1} style={{ flex: 1, width: '100%', height: '100%' }} />
                        <Text style={styles.compareLabel}>{asset1.date}</Text>
                    </View>
                    <View style={styles.compareItem}>
                        <ZoomableSecureImage asset={asset2} style={{ flex: 1, width: '100%', height: '100%' }} />
                        <Text style={styles.compareLabel}>{asset2.date}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                {viewState === 'GALLERY' ? (
                    <Pressable style={styles.modalOverlay} onPress={onClose}>
                        <Pressable onPress={(event) => event.stopPropagation()}>
                            {renderGallery()}
                        </Pressable>
                    </Pressable>
                ) : (
                    <View style={styles.modalOverlay}>
                        {viewState === 'FULL_SCREEN' && renderFullScreen()}
                        {viewState === 'COMPARISON' && renderComparison()}
                    </View>
                )}
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { backgroundColor: '#F2F2F7', borderRadius: 12, overflow: 'hidden', width: '95%', maxWidth: 900, height: '85%' },
    webContainer: { maxWidth: 1000, height: '85%' },
    nativeContainer: { height: '85%' },
    header: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, height: 50 },
    headerTitle: { color: 'white', fontSize: 17, fontWeight: '600' },
    headerButtonLeft: { minWidth: 60 },
    headerButtonRight: { minWidth: 30, alignItems: 'flex-end' },
    headerButtonText: { color: 'white', fontSize: 16 },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { flex: 1, padding: 20 },
    sectionContainer: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 10, marginLeft: 4 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
    captureCard: { width: 110, height: 110, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#007AFF', alignItems: 'center', justifyContent: 'center', margin: 8 },
    captureText: { marginTop: 8, color: '#007AFF', fontWeight: '600', fontSize: 11, textAlign: 'center' },
    assetCard: { width: 110, margin: 8, alignItems: 'center' },
    thumbnailImage: { width: 110, height: 110, borderRadius: 8, backgroundColor: '#E5E5EA' },
    pdfThumbnail: { width: 110, height: 110, borderRadius: 8, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
    filenameContainer: { marginTop: 6, width: '100%', paddingHorizontal: 2, backgroundColor: '#F9FAFB', borderRadius: 4, paddingVertical: 2, borderWidth: 1, borderColor: '#E5E5EA' },
    filenameText: { fontSize: 10, color: '#3C3C43', textAlign: 'center' },

    // View States Overlays
    fullScreenOverlay: { flex: 1, width: '100%', height: '100%', backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    fullScreenCloseButton: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    fullScreenImage: { width: '100%', height: '100%' },
    fullScreenLabelContainer: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    fullScreenLabel: { color: 'white', fontSize: 14 },

    selectionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 8, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 8 },
    selectionCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'white', backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    selectionCircleSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },

    comparisonHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
    comparisonTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    comparisonContent: { flex: 1, width: '100%', flexDirection: 'column', paddingTop: 80, paddingBottom: 20 },
    compareItem: { flex: 1, width: '100%', borderBottomWidth: 1, borderColor: '#333' },
    compareLabel: { position: 'absolute', bottom: 20, alignSelf: 'center', color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
});
