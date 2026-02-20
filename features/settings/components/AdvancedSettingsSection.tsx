import React, { useState } from 'react';
import {
    ActivityIndicator,
    GestureResponderEvent,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DrawingCanvas from '@/components/consultation/drawing-canvas';
import type { StrokeData } from '@/entities/consultation/types';
import SettingsSectionHeader from '@/features/settings/components/SettingsSectionHeader';
import type { AdvancedSettings } from '@/features/settings/types';

export interface AdvancedSettingsComponentProps {
    settings: AdvancedSettings;
    onChange: (key: keyof AdvancedSettings, value: any) => void;
    onSave: () => Promise<void>;
    isDirty: boolean;
    isSaving: boolean;
}

interface Props extends AdvancedSettingsComponentProps {
    onProfilePress: () => void;
    onLogoutPress: () => void;
}

const MIN_PENCIL_THICKNESS = 1;
const MAX_PENCIL_THICKNESS = 50;
const SLIDER_THUMB_SIZE = 18;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.0;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePencilThickness(value: unknown): number {
    return clamp(Math.round(toNumber(value, MIN_PENCIL_THICKNESS)), MIN_PENCIL_THICKNESS, MAX_PENCIL_THICKNESS);
}

const AdvancedSettingsSection = ({
    settings,
    onChange,
    onSave,
    isDirty,
    isSaving,
    onProfilePress,
    onLogoutPress,
}: Props) => {
    const [sliderWidth, setSliderWidth] = useState(0);
    const [previewStrokes, setPreviewStrokes] = useState<StrokeData[]>([]);
    const [previewCanvasKey, setPreviewCanvasKey] = useState(0);
    const [scaleSliderWidth, setScaleSliderWidth] = useState(0);
    const [scaleValue, setScaleValue] = useState(1);

    const pencilThickness = normalizePencilThickness(settings.pencil_thickness);
    const sliderProgress = (pencilThickness - MIN_PENCIL_THICKNESS) / (MAX_PENCIL_THICKNESS - MIN_PENCIL_THICKNESS);
    const thumbLeft = sliderWidth > SLIDER_THUMB_SIZE
        ? sliderProgress * (sliderWidth - SLIDER_THUMB_SIZE)
        : 0;
    const scaleProgress = (scaleValue - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
    const scaleThumbLeft = scaleSliderWidth > SLIDER_THUMB_SIZE
        ? scaleProgress * (scaleSliderWidth - SLIDER_THUMB_SIZE)
        : 0;

    const updatePencilFromTouch = (event: GestureResponderEvent) => {
        if (sliderWidth <= 0) return;
        const x = clamp(event.nativeEvent.locationX, 0, sliderWidth);
        const ratio = x / sliderWidth;
        const next = normalizePencilThickness(
            MIN_PENCIL_THICKNESS + ratio * (MAX_PENCIL_THICKNESS - MIN_PENCIL_THICKNESS)
        );
        onChange('pencil_thickness', next);
    };

    const updateScaleFromTouch = (event: GestureResponderEvent) => {
        if (scaleSliderWidth <= 0) return;
        const x = clamp(event.nativeEvent.locationX, 0, scaleSliderWidth);
        const ratio = x / scaleSliderWidth;
        const next = MIN_SCALE + ratio * (MAX_SCALE - MIN_SCALE);
        setScaleValue(Number(next.toFixed(1)));
    };

    const renderInput = (label: string, key: keyof AdvancedSettings, defaultValue: string) => (
        <View className="mb-6">
            <Text className="text-sm font-medium text-gray-600 mb-2">{label}</Text>
            <TextInput
                className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                value={String(settings[key] ?? defaultValue)}
                onChangeText={(text) => {
                    if (text.trim() === '') {
                        onChange(key, 0);
                        return;
                    }
                    const val = text === '' ? 0 : Number(text);
                    if (!isNaN(val)) onChange(key, val);
                }}
                keyboardType="numeric"
            />
        </View>
    );

    return (
        <View className="flex-1 bg-white p-8">
            <SettingsSectionHeader
                title="Settings"
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
                absoluteActions
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="flex-row mb-12">
                    <View className="w-48 pt-2">
                        <Text className="text-lg font-bold text-gray-900">Pencil</Text>
                    </View>
                    <View className="flex-1 max-w-2xl">
                        <View className="flex-row items-center mb-4">
                            <Text className="text-gray-600 w-32">Pencil thickness</Text>
                            <View
                                className="flex-1 mx-4 h-8 justify-center"
                                onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
                                onStartShouldSetResponder={() => true}
                                onStartShouldSetResponderCapture={() => true}
                                onMoveShouldSetResponder={() => true}
                                onMoveShouldSetResponderCapture={() => true}
                                onResponderGrant={updatePencilFromTouch}
                                onResponderMove={updatePencilFromTouch}
                            >
                                <View className="h-1.5 bg-gray-200 rounded-full" pointerEvents="none" />
                                <View
                                    className="absolute left-0 h-1.5 bg-blue-500 rounded-full"
                                    style={{ width: `${sliderProgress * 100}%` }}
                                    pointerEvents="none"
                                />
                                <View
                                    className="absolute rounded-full bg-white border border-gray-300"
                                    style={{
                                        width: SLIDER_THUMB_SIZE,
                                        height: SLIDER_THUMB_SIZE,
                                        top: 3,
                                        left: thumbLeft,
                                    }}
                                    pointerEvents="none"
                                />
                            </View>
                            <TextInput
                                className="w-14 p-1 border border-gray-200 rounded text-center text-gray-900 font-medium ml-2"
                                value={String(pencilThickness)}
                                onChangeText={(text) => {
                                    const val = Number(text);
                                    if (!isNaN(val)) onChange('pencil_thickness', normalizePencilThickness(val));
                                }}
                                keyboardType="numeric"
                            />
                        </View>
                        <View className="h-44 w-full bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                            <DrawingCanvas
                                key={`advanced-preview-${previewCanvasKey}`}
                                canvasOnly
                                initialDrawings={previewStrokes}
                                onStrokesChange={setPreviewStrokes}
                                penColor="#111827"
                                penThickness={pencilThickness}
                                isErasing={false}
                                style={{ flex: 1 }}
                            />
                        </View>
                        <View className="flex-row items-center justify-between mt-3">
                            <Text className="text-xs text-gray-500">Draw here to test pencil thickness</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setPreviewStrokes([]);
                                    setPreviewCanvasKey((prev) => prev + 1);
                                }}
                                className="px-3 py-1"
                            >
                                <Text className="text-sm text-blue-600 font-medium">Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="flex-row mb-12">
                    <View className="w-48 pt-2">
                        <Text className="text-lg font-bold text-gray-900">Spacing</Text>
                    </View>
                    <View className="flex-1 max-w-md">
                        {renderInput('Top Space', 'top_space', '110')}
                        {renderInput('Bottom Space', 'bottom_space', '30')}
                        {renderInput('Left Space', 'left_space', '70')}
                    </View>
                </View>

                <View className="flex-row mb-12">
                    <View className="w-48 pt-3">
                        <Text className="text-base font-bold text-gray-900">Scale</Text>
                    </View>
                    <View className="flex-1 max-w-md">
                        <View className="flex-row items-center">
                            <View
                                className="flex-1 h-8 justify-center"
                                onLayout={(event) => setScaleSliderWidth(event.nativeEvent.layout.width)}
                                onStartShouldSetResponder={() => true}
                                onStartShouldSetResponderCapture={() => true}
                                onMoveShouldSetResponder={() => true}
                                onMoveShouldSetResponderCapture={() => true}
                                onResponderGrant={updateScaleFromTouch}
                                onResponderMove={updateScaleFromTouch}
                            >
                                <View className="h-1.5 bg-gray-200 rounded-full" pointerEvents="none" />
                                <View
                                    className="absolute left-0 h-1.5 bg-blue-500 rounded-full"
                                    style={{ width: `${scaleProgress * 100}%` }}
                                    pointerEvents="none"
                                />
                                <View
                                    className="absolute rounded-full bg-white border border-gray-300"
                                    style={{
                                        width: SLIDER_THUMB_SIZE,
                                        height: SLIDER_THUMB_SIZE,
                                        top: 3,
                                        left: scaleThumbLeft,
                                    }}
                                    pointerEvents="none"
                                />
                            </View>
                            <Text className="ml-4 text-gray-900 text-base w-10">{scaleValue.toFixed(1)}</Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row mb-12 items-center">
                    <View className="w-48 pt-1">
                        <Text className="text-base font-bold text-gray-900">Followup Window</Text>
                    </View>
                    <View className="flex-1 max-w-md">
                        <TextInput
                            className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
                            value={String(settings.followup_window ?? 0)}
                            onChangeText={(text) => {
                                if (text.trim() === '') {
                                    onChange('followup_window', 0);
                                    return;
                                }
                                const val = Number(text);
                                if (!isNaN(val)) onChange('followup_window', val);
                            }}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View className="items-end mt-4 mb-20 pr-4">
                    <TouchableOpacity
                        onPress={onSave}
                        disabled={!isDirty || isSaving}
                        className={`px-8 py-3 rounded-lg border ${!isDirty || isSaving
                                ? 'bg-gray-50 border-gray-200 opacity-50'
                                : 'bg-white border-blue-500 active:bg-blue-50'
                            }`}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                            <Text className={`${!isDirty ? 'text-gray-400' : 'text-blue-600'} font-bold`}>
                                {isDirty ? 'Update Settings' : 'Saved'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default AdvancedSettingsSection;
