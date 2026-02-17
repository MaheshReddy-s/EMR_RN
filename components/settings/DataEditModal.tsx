import { DATA_EDIT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

interface DataEditModalProps {
    visible: boolean;
    initialValue?: string;
    title: string;
    onClose: () => void;
    onSave: (value: string) => Promise<void>;
}

export const DataEditModal = ({ visible, initialValue = '', title, onClose, onSave }: DataEditModalProps) => {
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue, visible]);

    const handleSave = async () => {
        if (!value.trim()) return;
        setIsSaving(true);
        try {
            await onSave(value);
            onClose();
        } catch (error) {
            if (__DEV__) console.error('Failed to save data item', error);
            Alert.alert('Error', 'Failed to save item. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="w-full max-w-md"
                    >
                        <TouchableWithoutFeedback>
                            <View className="bg-white rounded-2xl p-6 shadow-xl">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-xl font-bold text-gray-800">{title}</Text>
                                    <TouchableOpacity onPress={onClose} className="p-1">
                                        <Icon icon={DATA_EDIT_ICONS.close} size={24} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>

                                <View className="mb-6">
                                    <Text className="text-sm font-medium text-gray-700 mb-2">Name / Value</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                                        placeholder="Enter value..."
                                        value={value}
                                        onChangeText={setValue}
                                        autoFocus
                                        returnKeyType="done"
                                        onSubmitEditing={handleSave}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={isSaving || !value.trim()}
                                    className={`flex-row items-center justify-center py-4 rounded-xl ${!value.trim() ? 'bg-gray-200' : 'bg-blue-600'
                                        }`}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className={`font-semibold text-lg ${!value.trim() ? 'text-gray-400' : 'text-white'}`}>
                                            Save Changes
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
