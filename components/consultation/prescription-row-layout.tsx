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
            className="bg-white border-b border-[#e9ecef] flex-row"
            style={[style, { minHeight: effectiveHeight }]}
        >
            <View className="flex-1 relative">
                {/* Text Layer - Relative on web for visibility, Absolute on app for drawing */}
                <View
                    className={Platform.OS === 'web' ? "px-2 pt-[5.6px] pb-[5.6px] z-20" : "absolute top-0 left-0 right-0 px-2 pt-[5.6px] pb-[5.6px] z-20"}
                    pointerEvents={Platform.OS === 'web' ? "auto" : "none"}
                >
                    <View className="flex-row items-start">
                        {showIndex && (
                            <Text className="text-[13.5px] font-semibold text-gray-500 mr-1 mt-[1px]">
                                {index + 1}.
                            </Text>
                        )}
                        <View className="flex-1">
                            <Text
                                className="text-gray-900 font-bold"
                                style={[{ fontSize: 13.5 }, isFullWidth && { fontWeight: 'normal', fontSize: 13 }]}
                                numberOfLines={2}
                            >
                                {prescription?.name}
                            </Text>
                        </View>

                        {Platform.OS !== 'web' && !isFullWidth && (
                            <View className="flex-row items-start justify-end ml-2" style={{ width: '45%' }}>
                                <Text
                                    className="text-gray-700 font-bold text-right flex-1"
                                    style={{ fontSize: 13.5 }}
                                    numberOfLines={1}
                                >
                                    {prescription?.dosage}
                                </Text>
                                <Text
                                    className="text-gray-900 font-bold text-right ml-2"
                                    style={{ fontSize: 13.2, minWidth: 60 }}
                                    numberOfLines={1}
                                >
                                    {prescription?.duration}
                                </Text>
                            </View>
                        )}
                    </View>

                    {Platform.OS === 'web' && !isFullWidth && (
                        <View className="flex-row mt-1">
                            <Text className="text-gray-700 font-bold text-[13px] mr-2">{prescription?.dosage}</Text>
                            <Text className="text-gray-900 font-bold text-[13px]">{prescription?.duration}</Text>
                        </View>
                    )}
                </View>

                {/* Canvas Overlay - Hidden on web */}
                {Platform.OS !== 'web' && (
                    <View className="absolute top-0 left-0 right-0 bottom-0 z-10">
                        {renderCanvas()}
                    </View>
                )}
            </View>

            {/* Action Tools - Fixed on right side */}
            <View
                className="flex-row items-start justify-end px-1"
                style={{ width: 105, height: 35 }}
            >
                <TouchableOpacity
                    className="justify-center items-center w-[25px] h-full"
                    onPress={onExpand}
                >
                    <Icon icon={PRESCRIPTION_ROW_ICONS.expand} size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                    className="justify-center items-center w-[25px] h-full"
                    onPress={onEdit}
                >
                    <Icon icon={PRESCRIPTION_ROW_ICONS.edit} size={18} color="#007AFF" />
                </TouchableOpacity>
                {Platform.OS !== 'web' && (
                    <TouchableOpacity
                        className="justify-center items-center w-[25px] h-full"
                        onPress={onClear}
                    >
                        <Icon icon={PRESCRIPTION_ROW_ICONS.clear} size={18} color="#007AFF" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    className="justify-center items-center w-[25px] h-full"
                    onPress={onDelete}
                >
                    <Icon icon={PRESCRIPTION_ROW_ICONS.delete} size={18} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
