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
                    className={Platform.OS === 'web' ? "px-4 pt-1 z-20" : "absolute top-0 left-0 right-0 z-20"}
                    pointerEvents={Platform.OS === 'web' ? "auto" : "none"}
                    style={{ height: '100%' }}
                >
                    {/* Row 1: Exact coordinates from POC for prescriptions, Different style for other sections */}
                    <View style={{ height: isFullWidth ? 'auto' : 25, position: 'relative', minHeight: 22 }}>
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
                                position: isFullWidth ? 'relative' : 'absolute',
                                left: showIndex ? 28 : 10,
                                top: 1,
                                width: isFullWidth ? '95%' : (showIndex ? 235 : 260),
                                fontSize: 13.5,
                                fontWeight: isFullWidth ? 'normal' : 'bold',
                                color: isFullWidth ? '#495057' : '#212529',
                                textTransform: isFullWidth ? 'none' : 'uppercase'
                            }}
                            numberOfLines={isFullWidth ? 2 : 1}
                        >
                            {prescription?.name}
                        </Text>

                        {!isFullWidth && (
                            <>
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
                            </>
                        )}
                    </View>

                    {/* Row 2: Dosage/Instructions for prescriptions, Notes for other sections */}
                    {(() => {
                        if (isFullWidth) {
                            if (!prescription?.notes) return null;
                            return (
                                <View style={{ paddingLeft: 10, paddingRight: 10, marginTop: 0 }}>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: '#6c757d',
                                            lineHeight: 18
                                        }}
                                        numberOfLines={0} // No limit for notes in other sections
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
                                <View style={{ height: 20, position: 'relative', marginTop: 1 }}>
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
