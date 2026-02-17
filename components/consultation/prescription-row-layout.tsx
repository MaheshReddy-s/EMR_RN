import React from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
    ACTION_BUTTONS_RESERVED_WIDTH,
    MIN_ROW_HEIGHT
} from './tablet-dimensions';
import { Icon } from '@/components/ui/Icon';
import { PRESCRIPTION_ROW_ICONS } from '@/constants/icons';

// FIXED WIDTH SPECIFICATION: 720px
export const FIXED_CONTENT_WIDTH = 720;
export const ACTION_BUTTONS_WIDTH = ACTION_BUTTONS_RESERVED_WIDTH;
export const API_REFERENCE_WIDTH = 820;

interface PrescriptionRowLayoutProps {
    index: number;
    prescription: any; // Using any to be compatible with ConsultationItem and PrescriptionData
    height: number;
    renderCanvas: () => React.ReactNode;
    onExpand: () => void;
    onDelete: () => void;
    onClear: () => void;
    onEdit?: () => void;
    canClear: boolean;
    showIndex?: boolean;
    isFullWidth?: boolean;
    style?: any;
}

export default function PrescriptionRowLayout({
    index,
    prescription,
    height,
    renderCanvas,
    onExpand,
    onDelete,
    onClear,
    onEdit,
    isFullWidth,
    canClear,
    showIndex = false,
    style
}: PrescriptionRowLayoutProps) {
    // Auto-expansion disabled as per user request (only manual expansion allow)
    // const getMaxYFromDrawings = (drawings: any[]): number => { ... } 
    // const drawingMaxY = getMaxYFromDrawings(prescription.drawings);
    // const drawingBasedHeight = drawingMaxY > 0 ? drawingMaxY + 15 : 0;

    const effectiveHeight = Math.max(height, MIN_ROW_HEIGHT);

    return (
        <View
            className="bg-white border-b border-[#e9ecef] relative"
            style={[style, { minHeight: effectiveHeight }]}
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
                bounces={false}
            >
                <View
                    className="relative"
                    style={{ minHeight: effectiveHeight, width: 858 }}
                >
                    {/* Text Layer - Relative on web for visibility, Absolute on app for drawing */}
                    <View
                        className={Platform.OS === 'web' ? "p-2 z-20" : "absolute top-0 left-0 right-0 bottom-0 z-20"}
                        pointerEvents={Platform.OS === 'web' ? "auto" : "none"}
                    >
                        {showIndex && (
                            <Text
                                className={Platform.OS === 'web' ? "text-[13.5px] font-semibold text-gray-500 mr-2" : "absolute h-6 text-[13.5px] font-semibold text-gray-500 text-left"}
                                style={Platform.OS !== 'web' && { left: 10, top: 1, width: 25, textAlignVertical: 'center' }}
                            >
                                {index + 1}.
                            </Text>
                        )}
                        <Text
                            className="text-gray-900"
                            style={[
                                Platform.OS === 'web' ? { fontSize: 13.5, fontWeight: 'bold' } : { position: 'absolute', left: showIndex ? 28 : 10, top: 1, width: isFullWidth ? 520 : (showIndex ? 270 : 288), fontSize: 13.5, fontWeight: 'bold' },
                                isFullWidth && Platform.OS !== 'web' && { fontWeight: 'normal', fontSize: 13 }
                            ]}
                        >
                            {prescription?.name}
                        </Text>
                        {!isFullWidth && (
                            <View className={Platform.OS === 'web' ? "flex-row mt-1" : ""}>
                                <Text
                                    className="text-gray-700 font-bold"
                                    style={Platform.OS === 'web' ? { fontSize: 13, marginRight: 10 } : { position: 'absolute', left: 316, top: 1, width: 230, fontSize: 13.5 }}
                                >
                                    {prescription?.dosage}
                                </Text>
                                <Text
                                    className="text-gray-900 font-bold"
                                    numberOfLines={1}
                                    style={Platform.OS === 'web' ? { fontSize: 13 } : { position: 'absolute', left: 554, top: 1, width: 160, textAlign: 'right', fontSize: 13.2 }}
                                >
                                    {prescription?.duration}
                                </Text>
                            </View>
                        )}
                        {prescription?.notes && Platform.OS === 'web' && (
                            <Text className="text-[13px] text-gray-600 mt-1">
                                {prescription?.notes}
                            </Text>
                        )}
                    </View>

                    {/* Canvas Overlay - Hidden on web */}
                    {Platform.OS !== 'web' && (
                        <View
                            className="absolute top-0 left-0 bottom-0 z-10"
                            style={{ width: FIXED_CONTENT_WIDTH }}
                        >
                            {renderCanvas()}
                        </View>
                    )}
                </View>

                {/* Floating Tools */}
                <View
                    className="absolute z-[99] flex-row items-center p-0"
                    style={{ top: 2, left: 720, width: 100, height: 22.5 }}
                >
                    <TouchableOpacity
                        className="justify-center items-center"
                        style={{ width: 25, height: 28 }}
                        onPress={onExpand}
                    >
                        <Icon icon={PRESCRIPTION_ROW_ICONS.expand} size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="justify-center items-center"
                        style={{ width: 25, height: 28 }}
                        onPress={onEdit}
                    >
                        <Icon icon={PRESCRIPTION_ROW_ICONS.edit} size={18} color="#007AFF" />
                    </TouchableOpacity>
                    {Platform.OS !== 'web' && (
                        <TouchableOpacity
                            className="justify-center items-center"
                            style={{ width: 25, height: 28 }}
                            onPress={onClear}
                        >
                            <Icon icon={PRESCRIPTION_ROW_ICONS.clear} size={18} color="#007AFF" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        className="justify-center items-center"
                        style={{ width: 25, height: 28 }}
                        onPress={onDelete}
                    >
                        <Icon icon={PRESCRIPTION_ROW_ICONS.delete} size={18} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
