import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import type { Patient } from '@/entities';
import { PATIENT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface PatientProfileBlockProps {
    patient: Patient;
    onEditProfile: () => void;
    onStartConsultation?: () => void;
}

const PatientProfileBlock = ({
    patient,
    onEditProfile,
    onStartConsultation,
}: PatientProfileBlockProps) => {
    const isWeb = Platform.OS === 'web';

    return (
        <View className={`border-b border-gray-200 ${isWeb ? 'px-4 py-4' : 'px-6 py-6'}`}>
            <View className="flex-row items-center">
                <View
                    className="bg-blue-50 items-center justify-center mr-5"
                    style={{
                        width: isWeb ? 60 : 80,
                        height: isWeb ? 60 : 80,
                        borderRadius: isWeb ? 30 : 40,
                    }}
                >
                    <Icon icon={PATIENT_ICONS.account} size={isWeb ? 32 : 40} color="#007AFF" />
                </View>

                <View className="flex-1 flex-row justify-between pr-4">
                    <View>
                        <Text
                            className="text-gray-700 mb-1"
                            style={{ fontSize: isWeb ? 14 : 15 }}
                        >
                            <Text className="font-semibold">Name: </Text>{patient.patient_name}
                        </Text>
                        <Text
                            className="text-gray-700"
                            style={{ fontSize: isWeb ? 14 : 15 }}
                        >
                            <Text className="font-semibold">Mobile: </Text>{patient.patient_mobile}
                        </Text>
                    </View>
                    <View>
                        <Text
                            className="text-gray-700 mb-1"
                            style={{ fontSize: isWeb ? 14 : 15 }}
                        >
                            <Text className="font-semibold">Age: </Text>{patient.age || 'N/A'}
                        </Text>
                        <Text
                            className="text-gray-700"
                            style={{ fontSize: isWeb ? 14 : 15 }}
                        >
                            <Text className="font-semibold">Gender: </Text>{patient.gender || 'N/A'}
                        </Text>
                    </View>
                </View>
            </View>

            <View className={`flex-row items-center justify-between ${isWeb ? 'mt-4' : 'mt-8'}`}>
                <TouchableOpacity
                    onPress={onEditProfile}
                    className="bg-white border border-blue-500 rounded-full"
                    style={{ paddingHorizontal: isWeb ? 16 : 24, paddingVertical: isWeb ? 6 : 10 }}
                >
                    <Text className="text-[#007AFF] font-medium" style={{ fontSize: isWeb ? 14 : 15 }}>Edit Profile</Text>
                </TouchableOpacity>

                {onStartConsultation && (
                    <TouchableOpacity
                        onPress={onStartConsultation}
                        className="bg-blue-500 rounded-full"
                        style={{ paddingHorizontal: isWeb ? 16 : 24, paddingVertical: isWeb ? 6 : 10 }}
                    >
                        <Text className="text-white font-medium" style={{ fontSize: isWeb ? 14 : 15 }}>Start Consultation</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default PatientProfileBlock;
