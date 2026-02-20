import { EDIT_PROFILE_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

import type { Patient } from '@/entities';
import { PatientRepository } from '@/repositories';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    patient: Patient | null;
    onSave: (updatedPatient: Patient) => void;
}

export function EditProfileModal({ visible, onClose, patient, onSave }: EditProfileModalProps) {
    const isWeb = Platform.OS === 'web';
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Patient & { prefix?: string }>>({});

    // Dropdown state
    const [activeDropdown, setActiveDropdown] = useState<{
        key: keyof (Patient & { prefix?: string });
        label: string;
        options: string[];
    } | null>(null);

    useEffect(() => {
        if (visible && patient) {
            setFormData({
                patient_name: patient.patient_name,
                patient_mobile: patient.patient_mobile,
                gender: patient.gender || 'Male',
                age: patient.age?.toString() || '',
                dob: patient.dob || '',
                blood_group: patient.blood_group || '',
                height: patient.height || '',
                weight: patient.weight || '',
                locality: patient.locality || '',
                pincode: patient.pincode || '',
                prefix: (patient as any).prefix || 'Mr.',
            });
        }
    }, [visible, patient]);

    useEffect(() => {
        if (!visible) {
            setActiveDropdown(null);
        }
    }, [visible]);

    const handleSave = async () => {
        if (!formData.patient_name?.trim()) {
            Alert.alert('Error', 'Patient name is required');
            return;
        }

        const patientId = (patient as any)?._id || (patient as any)?.id;
        if (!patientId) {
            Alert.alert('Error', 'Invalid patient ID');
            return;
        }

        setIsSaving(true);
        try {
            const updated = await PatientRepository.updatePatient(patientId, formData);
            onSave({ ...patient, ...updated } as Patient);
            onClose();
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            if (__DEV__) console.error('Failed to update profile:', error);
            Alert.alert('Error', 'Could not update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const openDropdown = (key: keyof (Patient & { prefix?: string }), label: string, options: string[]) => {
        setActiveDropdown({ key, label, options });
    };

    const renderField = (
        label: string,
        value: string,
        key: keyof (Patient & { prefix?: string }),
        placeholder: string,
        keyboardType: any = 'default',
        isDropdown: boolean = false,
        options: string[] = [],
        webWidth: string = 'w-full'
    ) => {
        // Web Layout: Label Above Input, Grid Columns
        if (isWeb) {
            return (
                <View className={`mb-4 px-2 ${webWidth}`}>
                    <Text className="text-gray-600 font-medium mb-1.5 ml-1 text-sm">{label}</Text>
                    <View>
                        {isDropdown ? (
                            <TouchableOpacity
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between hover:bg-white hover:border-blue-400 transition-colors"
                                onPress={() => openDropdown(key, label, options)}
                            >
                                <Text className="text-gray-900 text-base">{value}</Text>
                                <Icon icon={EDIT_PROFILE_ICONS.keyboardArrowDown} size={20} color="#666" />
                            </TouchableOpacity>
                        ) : (
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base focus:bg-white focus:border-blue-500 outline-none"
                                value={value}
                                onChangeText={(text) => {
                                    if (key === 'age' && text.length > 2) return;
                                    if (key === 'patient_mobile' && text.length > 10) return;
                                    setFormData(prev => ({ ...prev, [key]: text }));
                                }}
                                placeholder={placeholder}
                                placeholderTextColor="#9ca3af"
                                keyboardType={keyboardType}
                            />
                        )}
                    </View>
                </View>
            );
        }

        // Mobile Layout: Label Left of Input, Row
        return (
            <View className="flex-row items-center mb-5 px-6">
                <Text className="text-gray-800 text-[16px] font-medium w-28">{label}</Text>
                <View className="flex-1">
                    {isDropdown ? (
                        <TouchableOpacity
                            className="bg-[#f2f4f7] rounded-md px-4 py-3 flex-row items-center justify-between"
                            onPress={() => openDropdown(key, label, options)}
                        >
                            <Text className="text-[#007AFF] text-[16px]">{value}</Text>
                            <Icon icon={EDIT_PROFILE_ICONS.keyboardArrowDown} size={24} color="#007AFF" />
                        </TouchableOpacity>
                    ) : (
                        <TextInput
                            className="bg-[#f2f4f7] rounded-md px-4 py-3 text-gray-900 text-[16px]"
                            value={value}
                            onChangeText={(text) => {
                                if (key === 'age' && text.length > 2) return;
                                if (key === 'patient_mobile' && text.length > 10) return;
                                setFormData(prev => ({ ...prev, [key]: text }));
                            }}
                            placeholder={placeholder}
                            placeholderTextColor="#9ca3af"
                            keyboardType={keyboardType}
                        />
                    )}
                </View>
            </View>
        );
    };

    const handleBackdropPress = () => {
        if (activeDropdown) {
            setActiveDropdown(null);
            return;
        }
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                if (activeDropdown) {
                    setActiveDropdown(null);
                    return;
                }
                onClose();
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <Pressable className="flex-1 justify-center items-center bg-black/40 px-4 py-8" onPress={handleBackdropPress}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        className={`w-full ${isWeb ? 'max-w-4xl' : 'max-w-[500px]'} bg-white rounded-3xl shadow-xl overflow-hidden`}
                        style={{ maxHeight: '100%' }}
                    >
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                            <TouchableOpacity onPress={onClose} className="p-2">
                                <Icon icon={EDIT_PROFILE_ICONS.close} size={28} color="#007AFF" />
                            </TouchableOpacity>
                            <Text className="text-gray-900 text-[18px] font-bold">Edit Profile</Text>
                            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#007AFF" />
                                ) : (
                                    <Icon icon={EDIT_PROFILE_ICONS.check} size={28} color="#22c55e" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            className="py-6"
                            keyboardShouldPersistTaps="handled"
                        >
                            <View className={isWeb ? "flex-row flex-wrap px-4" : ""}>
                                {renderField('Prefix', formData.prefix || 'Mr.', 'prefix', 'Prefix', 'default', true, ['Mr.', 'Mrs.', 'Ms.', 'Dr.'], 'w-1/6')}
                                {renderField('Name', formData.patient_name || '', 'patient_name', 'Full Name', 'default', false, [], 'w-5/12')}
                                {renderField('Mobile', formData.patient_mobile || '', 'patient_mobile', 'Mobile number', 'phone-pad', false, [], 'w-5/12')}

                                {renderField('Gender', formData.gender || 'Male', 'gender', 'Gender', 'default', true, ['Male', 'Female', 'Other'], 'w-1/3')}
                                {renderField('Age', formData.age?.toString() || '', 'age' as any, 'Age', 'numeric', false, [], 'w-1/3')}
                                {renderField('Blood Group', formData.blood_group || '', 'blood_group', 'Blood Group', 'default', false, [], 'w-1/3')}

                                {renderField('Height', formData.height || '', 'height', 'Height in feet', 'default', false, [], 'w-1/2')}
                                {renderField('Weight', formData.weight || '', 'weight', 'Weight in Kgs', 'numeric', false, [], 'w-1/2')}

                                {renderField('Locality', formData.locality || '', 'locality', 'Locality', 'default', false, [], 'w-2/3')}
                                {renderField('Pin Code', formData.pincode || '', 'pincode', 'Pincode', 'numeric', false, [], 'w-1/3')}
                            </View>

                            <View className="h-10" />
                        </ScrollView>
                    </Pressable>
                </Pressable>

                {activeDropdown ? (
                    <View className="absolute inset-0 justify-center items-center px-6" style={{ zIndex: 20 }}>
                        <Pressable
                            className="absolute inset-0 bg-black/50"
                            onPress={() => setActiveDropdown(null)}
                        />
                        <View className="bg-white rounded-2xl w-full max-w-[300px] overflow-hidden">
                            <View className="p-4 border-b border-gray-100 bg-gray-50">
                                <Text className="text-gray-900 font-bold text-center">{activeDropdown.label}</Text>
                            </View>
                            {activeDropdown.options.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    className="px-6 py-4 border-b border-gray-50 items-center"
                                    onPress={() => {
                                        setFormData(prev => ({ ...prev, [activeDropdown.key]: option }));
                                        setActiveDropdown(null);
                                    }}
                                >
                                    <Text className={`text-[17px] ${formData[activeDropdown.key] === option ? 'text-[#007AFF] font-bold' : 'text-gray-700'}`}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}
            </KeyboardAvoidingView>
        </Modal>
    );
}
