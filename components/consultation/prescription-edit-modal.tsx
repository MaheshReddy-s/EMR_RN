import { PRESCRIPTION_EDIT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React, { useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { PrescriptionVariant, PrescriptionData } from '@/entities/consultation/types';

// Re-export from centralized entity types for backward compatibility
export type { PrescriptionVariant, PrescriptionData } from '@/entities/consultation/types';

interface PrescriptionEditModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: PrescriptionData) => void;
    initialData?: PrescriptionData;
}

// Data Options
const UNITS = ['mg', 'mcg', 'iu', 'units', 'gm', 'drops', 'ml', 'tsp', 'tbsp', 'ug', 'million spores', 'N/A'];
const DURATIONS = ['1', '2', '3', '4', '5', '7', '10', '15', '21', '30', '60', '90'];
const FREQUENCIES = ['Daily', 'Biweekly', 'Triweekly', 'Weekly', 'Monthly', 'Stat', 'SoS'];
const INSTRUCTIONS_OPTIONS = ['Before Food', 'After Food', 'Empty Stomach', 'N/A'];
const DRUG_TYPES = [
    'Tablet', 'Syrup', 'Capsule', 'Injection', 'Cream', 'Drops', 'Powder', 'Sachet',
    'Ointment', 'Gel', 'Spray', 'Inhaler', 'Lotion', 'Suspension', 'Solution', 'Patch', 'Gargle'
];

export default function PrescriptionEditModal({
    visible,
    onClose,
    onSave,
    initialData,
}: PrescriptionEditModalProps) {
    // Basic Info
    const [brandName, setBrandName] = useState('');
    const [genericName, setGenericName] = useState('');
    const [type, setType] = useState('');
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [selectedFrequency, setSelectedFrequency] = useState('');

    // Quantity & Units
    const [quantity, setQuantity] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');

    // Duration
    const [selectedDuration, setSelectedDuration] = useState('');
    const [isCustomDuration, setIsCustomDuration] = useState(false);
    const [customDurationValue, setCustomDurationValue] = useState('');

    // Frequency Counts
    const [morning, setMorning] = useState('');
    const [afternoon, setAfternoon] = useState('');
    const [evening, setEvening] = useState('');
    const [night, setNight] = useState('');

    // Frequency Details/Time (The second row)
    const [morningDetail, setMorningDetail] = useState('');
    const [afternoonDetail, setAfternoonDetail] = useState('---');
    const [eveningDetail, setEveningDetail] = useState('---');
    const [nightDetail, setNightDetail] = useState('---');


    // Purchase Quantity
    const [purchaseCount, setPurchaseCount] = useState('');
    const [isPurchaseNA, setIsPurchaseNA] = useState(false);

    // Instructions
    const [selectedInstruction, setSelectedInstruction] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');

    useEffect(() => {
        if (initialData) {
            setBrandName(initialData.brandName || '');
            setGenericName(initialData.genericName || '');

            const variant = initialData.variants?.[0];
            if (variant) {
                setType(variant.type || '');

                // Parse Dosage
                const dosageParts = (variant.dosage || '').split(' ');
                if (dosageParts.length > 1) {
                    setQuantity(dosageParts[0]);
                    const potentialUnit = dosageParts.slice(1).join(' ');
                    if (UNITS.includes(potentialUnit)) {
                        setSelectedUnit(potentialUnit);
                    } else {
                        setSelectedUnit('');
                    }
                } else {
                    setQuantity(variant.dosage || '');
                    setSelectedUnit('');
                }

                // Parse Duration
                const durationVal = (variant.duration || '').replace(' Days', '');
                if (DURATIONS.includes(durationVal)) {
                    setSelectedDuration(durationVal);
                    setIsCustomDuration(false);
                } else if (durationVal === 'Until further instructions') {
                    setSelectedDuration('Until further instructions');
                    setIsCustomDuration(false);
                } else {
                    setSelectedDuration('');
                    setIsCustomDuration(true);
                    setCustomDurationValue(durationVal);
                }

                // Parse Timings (Handle: M-A-E-N, 1-0-1-0, or ------N)
                if (variant.timings) {
                    const t = variant.timings.toUpperCase();
                    if (t.includes('-') && t.split('-').length === 4) {
                        // Old 1-0-1-0 or M-A-E-N format with dashes
                        const parts = t.split('-');
                        const normalizePart = (v: string, letter: string) => {
                            const val = v.trim();
                            if (val === letter || val === '1') return '1';
                            return '0';
                        };
                        setMorning(normalizePart(parts[0], 'M'));
                        setAfternoon(normalizePart(parts[1], 'A'));
                        setEvening(normalizePart(parts[2], 'E'));
                        setNight(normalizePart(parts[3], 'N'));
                    } else {
                        // New compact format (e.g., ------N or MAEN)
                        setMorning(t.includes('M') || (t.startsWith('1') && !t.includes('-')) ? '1' : '0');
                        setAfternoon(t.includes('A') ? '1' : '0');
                        setEvening(t.includes('E') ? '1' : '0');
                        setNight(t.includes('N') ? '1' : '0');
                    }
                } else {
                    setMorning('');
                    setAfternoon('');
                    setEvening('');
                    setNight('');
                }

                // If we saved details before, we'd need to parse them here.
                // But for now, just default details.

                // Instructions
                let instr = variant.instructions || '';
                let foundStandard = false;
                for (const opt of INSTRUCTIONS_OPTIONS) {
                    if (instr.startsWith(opt)) {
                        setSelectedInstruction(opt);
                        let remainder = instr.substring(opt.length).trim();
                        if (remainder.startsWith('.')) remainder = remainder.substring(1).trim();
                        setCustomInstructions(remainder);
                        foundStandard = true;
                        break;
                    }
                }
                if (!foundStandard) {
                    setSelectedInstruction('');
                    setCustomInstructions(instr);
                }

                // Purchase Count
                if (variant.purchaseCount === 'N/A') {
                    setIsPurchaseNA(true);
                    setPurchaseCount('');
                } else {
                    setIsPurchaseNA(false);
                    setPurchaseCount(variant.purchaseCount || '1');
                }
            }
        } else {
            resetForm();
        }
    }, [initialData, visible]);

    const resetForm = () => {
        setBrandName('');
        setGenericName('');
        setType('Tablet');
        setQuantity('');
        setSelectedUnit('mg');
        setSelectedDuration('5');
        setIsCustomDuration(false);
        setCustomDurationValue('');
        setMorning('');
        setAfternoon('');
        setEvening('');
        setNight('');
        setMorningDetail('');
        setAfternoonDetail('---');
        setEveningDetail('---');
        setNightDetail('---');
        setSelectedInstruction('After Food');
        setCustomInstructions('');
        setPurchaseCount('1');
        setIsPurchaseNA(false);
    };

    const handleChooseType = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...DRUG_TYPES, 'Cancel'],
                    cancelButtonIndex: DRUG_TYPES.length,
                },
                (buttonIndex) => {
                    if (buttonIndex < DRUG_TYPES.length) {
                        setType(DRUG_TYPES[buttonIndex]);
                    }
                }
            );
        } else {
            // Android/Web: toggle a dropdown picker instead of simple cycle
            setShowTypePicker(!showTypePicker);
        }
    };

    const handleFrequencySelect = (freq: string) => {
        setSelectedFrequency(freq);
        // Map frequency labels to timing values
        switch (freq) {
            case 'Daily':
                setMorning('1'); setAfternoon('1'); setEvening('1'); setNight('1');
                break;
            case 'Biweekly':
            case 'Triweekly':
            case 'Weekly':
            case 'Monthly':
                setMorning('1'); setAfternoon('0'); setEvening('0'); setNight('0');
                break;
            case 'Stat':
                setMorning('1'); setAfternoon('0'); setEvening('0'); setNight('0');
                break;
            case 'SoS':
                setMorning('0'); setAfternoon('0'); setEvening('0'); setNight('0');
                break;
            default:
                break;
        }
    };

    const handleSave = () => {
        let finalDuration = '';
        if (isCustomDuration) {
            finalDuration = customDurationValue || 'Custom';
            if (/^\d+$/.test(finalDuration)) finalDuration += ' Days';
        } else {
            finalDuration = selectedDuration === 'Until further instructions' ? 'Until further instructions' : `${selectedDuration} Days`;
        }

        const finalDosage = quantity ? `${quantity} ${selectedUnit}` : selectedUnit;
        const finalTimings = [
            { val: morning, letter: 'M' },
            { val: afternoon, letter: 'A' },
            { val: evening, letter: 'E' },
            { val: night, letter: 'N' }
        ].map(t => {
            const v = t.val.trim().toUpperCase();
            if (t.letter && (v === '1' || v === t.letter)) return t.letter;
            if (v === '1') return '1'; // Handle non-letter slots if ever used
            if (v === 'TR' || v === 'T') return 'TR'; // Example specific code if needed, keeping simple matching for now
            // Just return '-' for blanks/zeros
            return '-';
        }).join('-');
        // NOTE: We are currently NOT saving the "Details" (row 2) into the simple timing string 
        // to preserve backward compatibility with the 'timings' string format "1-0-0-1".
        // If the backend/type supports it, we could append it.

        let finalInstructions = selectedInstruction;
        if (customInstructions) {
            finalInstructions = finalInstructions ? `${finalInstructions}, ${customInstructions}` : customInstructions;
        }

        const variant: PrescriptionVariant = {
            id: initialData?.variants?.[0]?.id || Date.now().toString(),
            type,
            dosage: finalDosage,
            duration: finalDuration,
            timings: finalTimings,
            instructions: finalInstructions,
            purchaseCount: isPurchaseNA ? 'N/A' : purchaseCount
        };

        onSave({
            brandName,
            genericName,
            variants: [variant]
        });
    };

    const handleBackdropPress = () => {
        if (showTypePicker) {
            setShowTypePicker(false);
            return;
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable className="flex-1 bg-black/50 justify-center items-center px-4 py-8" onPress={handleBackdropPress}>
                <Pressable onPress={(event) => event.stopPropagation()}>
                    <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl flex-1 max-h-[95%]"
                >
                    {/* Header */}
                    <View className="h-14 bg-white border-b border-gray-100 flex-row items-center justify-between px-4">
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Icon icon={PRESCRIPTION_EDIT_ICONS.close} size={28} color="#007AFF" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-black">Prescription Details</Text>
                        <TouchableOpacity onPress={handleSave} className="p-2">
                            <Icon icon={PRESCRIPTION_EDIT_ICONS.checkmark} size={28} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-8 py-6" showsVerticalScrollIndicator={false}>

                        {/* 1. Brand & Generic Name */}
                        <View className="mb-8 space-y-4">
                            <View className="flex-row items-center">
                                <Text className="w-32 text-base font-bold text-gray-800">Brand Name</Text>
                                <TextInput
                                    className="flex-1 h-11 border border-gray-300 rounded px-3 text-base bg-white"
                                    value={brandName}
                                    onChangeText={setBrandName}
                                    placeholder="Enter brand name"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View className="flex-row items-center">
                                <Text className="w-32 text-base font-bold text-gray-800">Generic Name</Text>
                                <TextInput
                                    className="flex-1 h-11 border border-gray-300 rounded px-3 text-base bg-white"
                                    value={genericName}
                                    onChangeText={setGenericName}
                                    placeholder="Enter generic name"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            {/* Choose Type Button */}
                            <View style={{ position: 'relative', zIndex: 20 }}>
                                <TouchableOpacity
                                    onPress={handleChooseType}
                                    className="self-start mt-2 px-5 py-2.5 border border-[#007AFF] rounded-lg bg-white"
                                >
                                    <Text className="text-[#007AFF] text-base font-medium">
                                        {type || 'Choose Type'} ▾
                                    </Text>
                                </TouchableOpacity>

                                {/* Dropdown picker for Android/Web */}
                                {showTypePicker && Platform.OS !== 'ios' && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 52,
                                            left: 0,
                                            width: 200,
                                            maxHeight: 240,
                                            backgroundColor: 'white',
                                            borderWidth: 1,
                                            borderColor: '#E5E7EB',
                                            borderRadius: 8,
                                            zIndex: 100,
                                            elevation: 10,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.15,
                                            shadowRadius: 4,
                                        }}
                                    >
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 240 }}>
                                            {DRUG_TYPES.map((dt) => (
                                                <TouchableOpacity
                                                    key={dt}
                                                    onPress={() => {
                                                        setType(dt);
                                                        setShowTypePicker(false);
                                                    }}
                                                    className={`px-4 py-3 border-b border-gray-100 ${type === dt ? 'bg-blue-50' : ''}`}
                                                >
                                                    <Text className={`text-base ${type === dt ? 'text-[#007AFF] font-bold' : 'text-gray-700'}`}>
                                                        {dt}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* 2. Quantity & Units */}
                        <View className="mb-8">
                            <Text className="text-base font-bold text-gray-800 mb-3">Quantity & Units</Text>
                            <View className="flex-row h-11">
                                <TextInput
                                    className="w-20 border border-gray-300 border-r-0 rounded-l px-2 text-center text-base font-medium bg-white text-black"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                    placeholder="text"
                                />
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    className="flex-1 border border-gray-300 rounded-r bg-white"
                                    contentContainerStyle={{ flexDirection: 'row' }}
                                >
                                    {UNITS.map((unit, idx) => {
                                        const isSelected = selectedUnit === unit;
                                        return (
                                            <TouchableOpacity
                                                key={unit}
                                                onPress={() => setSelectedUnit(unit)}
                                                className={`px-3 justify-center items-center border-r border-gray-200 ${idx === UNITS.length - 1 ? 'border-r-0' : ''} ${isSelected ? 'bg-[#007AFF]' : 'bg-white'}`}
                                            >
                                                <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-[#007AFF]'}`}>{unit}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        {/* 3. Duration */}
                        <View className="mb-8">
                            <Text className="text-base font-bold text-gray-800 mb-3">Duration (Days)</Text>
                            <View className="flex-row h-11 items-center">
                                {/* Chips ScrollView */}
                                <View className="flex-1 border border-gray-300 rounded-l overflow-hidden bg-white mr-2">
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row' }}>
                                        {DURATIONS.map((d) => {
                                            const isSelected = selectedDuration === d && !isCustomDuration;
                                            return (
                                                <TouchableOpacity
                                                    key={d}
                                                    onPress={() => {
                                                        setSelectedDuration(d);
                                                        setIsCustomDuration(false);
                                                        setCustomDurationValue('');
                                                    }}
                                                    className={`w-12 justify-center items-center border-r border-gray-200 ${isSelected ? 'bg-[#007AFF]' : 'bg-white'}`}
                                                >
                                                    <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-[#007AFF]'}`}>{d}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedDuration('Until further instructions');
                                                setIsCustomDuration(false);
                                                setCustomDurationValue('');
                                            }}
                                            className={`px-4 justify-center items-center ${selectedDuration === 'Until further instructions' && !isCustomDuration ? 'bg-[#007AFF]' : 'bg-white'}`}
                                        >
                                            <Text className={`text-xs ${selectedDuration === 'Until further instructions' && !isCustomDuration ? 'text-white font-bold' : 'text-[#007AFF]'}`}>Until further instructions</Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>

                                {/* Always Visible Custom Input */}
                                <TextInput
                                    className={`w-24 h-11 border border-gray-300 rounded px-3 text-base text-center ${customDurationValue ? 'bg-blue-50 border-blue-300 text-black' : 'bg-white text-gray-800'}`}
                                    value={customDurationValue}
                                    onChangeText={(text) => {
                                        setCustomDurationValue(text);
                                        if (text) {
                                            setIsCustomDuration(true);
                                            setSelectedDuration('');
                                        } else {
                                            setIsCustomDuration(false);
                                        }
                                    }}
                                    placeholder="Custom"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        {/* 4. Frequency */}
                        <View className="mb-8">
                            <Text className="text-base font-bold text-gray-800 mb-3">Frequency</Text>

                            {/* Blue Headers */}
                            <View className="flex-row rounded-t-lg overflow-hidden bg-[#007AFF]">
                                <View className="flex-1 py-2 border-r border-blue-400 items-center"><Text className="text-white text-sm font-semibold">Morning</Text></View>
                                <View className="flex-1 py-2 border-r border-blue-400 items-center"><Text className="text-white text-sm font-semibold">Afternoon</Text></View>
                                <View className="flex-1 py-2 border-r border-blue-400 items-center"><Text className="text-white text-sm font-semibold">Evening</Text></View>
                                <View className="flex-1 py-2 items-center"><Text className="text-white text-sm font-semibold">Night</Text></View>
                            </View>

                            {/* Input Rows Container */}
                            <View className="rounded-b-lg border border-gray-300 border-t-0 bg-white overflow-hidden">
                                {/* Row 1: Counts */}
                                <View className="flex-row h-12 border-b border-gray-200">
                                    <View className="flex-1 border-r border-gray-200 bg-blue-50/50">
                                        <TextInput className="flex-1 text-center text-lg text-black font-semibold" value={morning} onChangeText={setMorning} keyboardType="numeric" selectTextOnFocus placeholder="0" />
                                    </View>
                                    <View className="flex-1 border-r border-gray-200">
                                        <TextInput className="flex-1 text-center text-lg text-black font-semibold" value={afternoon} onChangeText={setAfternoon} keyboardType="numeric" selectTextOnFocus placeholder="0" />
                                    </View>
                                    <View className="flex-1 border-r border-gray-200">
                                        <TextInput className="flex-1 text-center text-lg text-black font-semibold" value={evening} onChangeText={setEvening} keyboardType="numeric" selectTextOnFocus placeholder="0" />
                                    </View>
                                    <View className="flex-1">
                                        <TextInput className="flex-1 text-center text-lg text-black font-semibold" value={night} onChangeText={setNight} keyboardType="numeric" selectTextOnFocus placeholder="0" />
                                    </View>
                                </View>

                                {/* Row 2: Details/Time */}
                                <View className="flex-row h-10 bg-gray-50">
                                    <View className="flex-1 border-r border-gray-200 bg-blue-50/30">
                                        <TextInput className="flex-1 text-center text-xs text-gray-500" value={morningDetail} onChangeText={setMorningDetail} placeholder="---" />
                                    </View>
                                    <View className="flex-1 border-r border-gray-200">
                                        <TextInput className="flex-1 text-center text-xs text-gray-500" value={afternoonDetail} onChangeText={setAfternoonDetail} placeholder="---" />
                                    </View>
                                    <View className="flex-1 border-r border-gray-200">
                                        <TextInput className="flex-1 text-center text-xs text-gray-500" value={eveningDetail} onChangeText={setEveningDetail} placeholder="---" />
                                    </View>
                                    <View className="flex-1">
                                        <TextInput className="flex-1 text-center text-xs text-gray-500" value={nightDetail} onChangeText={setNightDetail} placeholder="---" />
                                    </View>
                                </View>
                            </View>

                            {/* (or) Separator */}
                            <View className="items-center my-4 relative">
                                <View className="absolute w-full h-[1px] bg-gray-200 top-1/2" />
                                <Text className="text-gray-500 text-xs bg-white px-2 relative font-medium uppercase tracking-wider">(or)</Text>
                            </View>

                            {/* Quick Frequencies */}
                            <View className="flex-row h-11 border border-gray-300 rounded overflow-hidden bg-white">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {FREQUENCIES.map((f, idx) => {
                                        const isFreqSelected = selectedFrequency === f;
                                        return (
                                            <TouchableOpacity
                                                key={f}
                                                onPress={() => handleFrequencySelect(f)}
                                                className={`px-5 justify-center items-center border-r border-gray-200 ${idx === FREQUENCIES.length - 1 ? 'border-r-0' : ''} ${isFreqSelected ? 'bg-[#007AFF]' : 'bg-white'}`}
                                            >
                                                <Text className={`text-sm font-medium ${isFreqSelected ? 'text-white' : 'text-[#007AFF]'}`}>{f}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        {/* 5. Number to be purchased */}
                        <View className="mb-8 flex-row items-center">
                            <Text className="text-base font-bold text-gray-800 mr-3">Number to be purchased</Text>
                            <TextInput
                                className={`w-24 h-11 border border-gray-300 rounded px-2 text-center text-base ${isPurchaseNA ? 'bg-gray-100 text-gray-400' : 'bg-white text-black'}`}
                                value={isPurchaseNA ? '' : purchaseCount}
                                onChangeText={setPurchaseCount}
                                editable={!isPurchaseNA}
                                keyboardType="numeric"
                            />

                            <TouchableOpacity
                                onPress={() => setIsPurchaseNA(!isPurchaseNA)}
                                className="flex-row items-center ml-5"
                            >
                                <View className={`w-6 h-6 rounded-full border border-gray-400 mr-2 items-center justify-center ${isPurchaseNA ? 'bg-gray-600 border-gray-600' : 'bg-white'}`}>
                                    {isPurchaseNA && <View className="w-3 h-3 rounded-full bg-white" />}
                                </View>
                                <Text className="text-base font-medium text-gray-700">N/A</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 6. Instruction */}
                        <View className="mb-12">
                            <Text className="text-base font-bold text-gray-800 mb-3">Instruction</Text>

                            <View className="flex-row items-center mb-4">
                                <Text className="text-base text-gray-600 mr-3 w-32">Should be taken</Text>
                                <View className="flex-1 flex-row border border-[#007AFF] rounded overflow-hidden h-9">
                                    {INSTRUCTIONS_OPTIONS.map((inst, idx) => {
                                        const isSelected = selectedInstruction === inst;
                                        return (
                                            <TouchableOpacity
                                                key={inst}
                                                onPress={() => setSelectedInstruction(inst)}
                                                className={`flex-1 justify-center items-center border-r border-[#007AFF] ${idx === INSTRUCTIONS_OPTIONS.length - 1 ? 'border-r-0' : ''} ${isSelected ? 'bg-[#007AFF]' : 'bg-white'}`}
                                            >
                                                <Text className={`text-xs ${isSelected ? 'text-white font-bold' : 'text-[#007AFF]'}`}>{inst}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TextInput
                                className="h-40 border border-gray-300 rounded p-4 bg-white text-base"
                                value={customInstructions}
                                onChangeText={setCustomInstructions}
                                placeholder="Enter instructions"
                                placeholderTextColor="#999"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>
                    </KeyboardAvoidingView>
                </Pressable>
            </Pressable>
        </Modal >
    );
}
