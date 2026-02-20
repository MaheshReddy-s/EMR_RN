import { Icon } from '@/components/ui/Icon';
import { EDIT_PROFILE_ICONS } from '@/constants/icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const INSTRUCTION_TYPES = ['Consultation', 'Follow Up', 'Procedure'] as const;

export type FollowupInstructionType = (typeof INSTRUCTION_TYPES)[number];

export interface FollowupInfoSelection {
    instructionType: FollowupInstructionType;
    note: string;
}

interface FollowupInfoModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (selection: FollowupInfoSelection) => void;
    initialValue?: FollowupInfoSelection;
}

export default function FollowupInfoModal({
    visible,
    onClose,
    onSubmit,
    initialValue,
}: FollowupInfoModalProps) {
    const [instructionType, setInstructionType] = useState<FollowupInstructionType>('Consultation');
    const [note, setNote] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setInstructionType(initialValue?.instructionType || 'Consultation');
        setNote(initialValue?.note || '');
        setIsDropdownOpen(false);
    }, [initialValue, visible]);

    const handleSubmit = () => {
        onSubmit({
            instructionType,
            note: note.trim(),
        });
    };

    const handleBackdropPress = () => {
        if (isDropdownOpen) {
            setIsDropdownOpen(false);
            return;
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable className="flex-1 bg-black/30 justify-center items-center px-4" onPress={handleBackdropPress}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    className="w-full max-w-[560px] rounded-2xl overflow-hidden bg-white"
                >
                    <View className="bg-[#0A84FF] px-5 py-4 flex-row items-center justify-between">
                        <TouchableOpacity onPress={onClose} className="p-1">
                            <Icon icon={EDIT_PROFILE_ICONS.close} size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text className="text-white text-[22px] font-semibold">Followup Information</Text>
                        <TouchableOpacity onPress={handleSubmit} className="p-1">
                            <Icon icon={EDIT_PROFILE_ICONS.check} size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View className="p-5">
                        <View className="flex-row items-start justify-between mb-4" style={{ zIndex: 20 }}>
                            <Text className="text-gray-900 text-[20px] font-semibold mt-2">Instruction Type</Text>

                            <View style={{ width: 240, zIndex: 30 }}>
                                <TouchableOpacity
                                    onPress={() => setIsDropdownOpen((prev) => !prev)}
                                    className="h-12 rounded-xl border border-[#0A84FF] px-3 flex-row items-center justify-between bg-white"
                                >
                                    <Text className="text-[#0A84FF] text-[16px]">{instructionType}</Text>
                                    <Icon
                                        icon={EDIT_PROFILE_ICONS.keyboardArrowDown}
                                        size={24}
                                        color="#0A84FF"
                                    />
                                </TouchableOpacity>

                                {isDropdownOpen ? (
                                    <View className="mt-1 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                                        {INSTRUCTION_TYPES.map((option) => (
                                            <TouchableOpacity
                                                key={option}
                                                onPress={() => {
                                                    setInstructionType(option);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="px-4 py-3 border-b border-gray-100"
                                            >
                                                <Text className="text-gray-800 text-[16px]">{option}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        <Text className="text-gray-400 text-[16px] mb-4">
                            If the doctor wants to change the consultation type, please select one from the dropdown.
                        </Text>

                        <TextInput
                            value={note}
                            onChangeText={setNote}
                            placeholder=""
                            multiline
                            textAlignVertical="top"
                            className="border border-gray-300 rounded-xl p-3 text-[16px] text-gray-900"
                            style={{ minHeight: 140 }}
                        />

                        <Text className="text-gray-400 text-[16px] mt-4">
                            This note will be shown in the Reminder List for front office staff to follow up with the patient.
                        </Text>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
