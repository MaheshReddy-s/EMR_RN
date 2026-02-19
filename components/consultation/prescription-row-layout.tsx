import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
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
export const NON_PRESCRIPTION_HORIZONTAL_PADDING = 16;
export const NON_PRESCRIPTION_VERTICAL_PADDING = 6;
export const NON_PRESCRIPTION_NAME_LINE_HEIGHT = 20;
export const NON_PRESCRIPTION_NOTES_LINE_HEIGHT = 18;
export const NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT = 32;
export const NON_PRESCRIPTION_NOTES_DEFAULT_ROW_HEIGHT = 62;
export const PRESCRIPTION_ROW_1_HEIGHT = 25;
export const PRESCRIPTION_ROW_2_HEIGHT = 20;
export const PRESCRIPTION_ROW_2_MARGIN_TOP = 1;
export const PRESCRIPTION_DEFAULT_ROW_HEIGHT = 26;
export const PRESCRIPTION_WITH_ROW_2_DEFAULT_ROW_HEIGHT = 46;

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
    const isNonPrescriptionRow = !!isFullWidth;
    const textLayerClassName = Platform.OS === 'web'
        ? "px-4 pt-1 z-20"
        : isNonPrescriptionRow
            ? "z-20"
            : "absolute top-0 left-0 right-0 z-20";

    return (
        <View
            className="bg-white border-b border-[#e9ecef] flex-row"
            style={[style, { minHeight: effectiveHeight }]}
        >
            <View className="flex-1 relative">
                {/* Text Layer - Relative on web for visibility, Absolute on app for drawing */}
                <View
                    className={textLayerClassName}
                    pointerEvents={Platform.OS === 'web' ? "auto" : "none"}
                    style={[
                        Platform.OS === 'web' || !isNonPrescriptionRow ? { height: '100%' } : null,
                        Platform.OS !== 'web' && isNonPrescriptionRow
                            ? {
                                paddingHorizontal: NON_PRESCRIPTION_HORIZONTAL_PADDING,
                                paddingVertical: NON_PRESCRIPTION_VERTICAL_PADDING,
                            }
                            : null,
                    ]}
                >
                    {isNonPrescriptionRow ? (
                        <View style={{ minHeight: NON_PRESCRIPTION_NAME_LINE_HEIGHT }}>
                            <Text
                                style={{
                                    fontSize: 14,
                                    lineHeight: NON_PRESCRIPTION_NAME_LINE_HEIGHT,
                                    color: '#495057',
                                }}
                            >
                                {prescription?.name || ''}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ height: PRESCRIPTION_ROW_1_HEIGHT, position: 'relative', minHeight: 22 }}>
                            {showIndex && (
                                <Text
                                    style={{
                                        position: 'absolute', left: 10, top: 1, width: 25,
                                        fontSize: 13.5, fontWeight: '600', color: '#6c757d'
                                    }}
                                >
                                    {index + 1}.
                                </Text>
                            )}
                            <Text
                                style={{
                                    position: 'absolute',
                                    left: showIndex ? 28 : 10,
                                    top: 1,
                                    width: showIndex ? 235 : 260,
                                    fontSize: 13.5,
                                    fontWeight: 'bold',
                                    color: '#212529',
                                    textTransform: 'uppercase'
                                }}
                                numberOfLines={1}
                            >
                                {prescription?.name}
                            </Text>

                            <Text
                                style={{
                                    position: 'absolute', left: 310, top: 1, width: 240,
                                    fontSize: 13.5, fontWeight: 'bold', color: '#495057'
                                }}
                            >
                                {prescription?.timings || ''}
                            </Text>
                            <Text
                                style={{
                                    position: 'absolute', right: 10, top: 1,
                                    fontSize: 13.2, fontWeight: 'bold', textAlign: 'right', color: '#000'
                                }}
                                numberOfLines={1}
                            >
                                {prescription?.duration && /^\d+$/.test(prescription.duration.trim())
                                    ? `${prescription.duration} Days`
                                    : prescription?.duration}
                            </Text>
                        </View>
                    )}

                    {/* Row 2: Dosage/Instructions for prescriptions, Notes for other sections */}
                    {(() => {
                        if (isNonPrescriptionRow) {
                            if (!prescription?.notes) return null;
                            return (
                                <View style={{ marginTop: 2 }}>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: '#6c757d',
                                            lineHeight: NON_PRESCRIPTION_NOTES_LINE_HEIGHT
                                        }}
                                    >
                                        {prescription.notes}
                                    </Text>
                                </View>
                            );
                        }

                        const hasDosage = !!(prescription?.dosage && prescription?.dosage !== 'N/A' && !prescription?.dosage.includes('-'));
                        const hasInstructions = !!prescription?.instructions;

                        if (hasDosage || hasInstructions) {
                            return (
                                <View style={{ height: PRESCRIPTION_ROW_2_HEIGHT, position: 'relative', marginTop: PRESCRIPTION_ROW_2_MARGIN_TOP }}>
                                    <Text
                                        style={{
                                            position: 'absolute', left: 10, width: 280,
                                            fontSize: 13.5, color: '#000'
                                        }}
                                        numberOfLines={1}
                                    >
                                        {hasDosage ? prescription.dosage : ''}
                                    </Text>
                                    <Text
                                        style={{
                                            position: 'absolute', left: 310, width: 400,
                                            fontSize: 13.5, color: '#000', fontStyle: 'italic',
                                            textAlign: 'left'
                                        }}
                                        numberOfLines={1}
                                    >
                                        {prescription?.instructions || ''}
                                    </Text>
                                </View>
                            );
                        }
                        return null;
                    })()}
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
