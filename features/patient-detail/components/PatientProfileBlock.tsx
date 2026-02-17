import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Patient } from '@/entities';
import { PATIENT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface PatientProfileBlockProps {
    patient: Patient;
    onEditProfile: () => void;
    onStartConsultation: () => void;
}

const PatientProfileBlock = ({
    patient,
    onEditProfile,
    onStartConsultation,
}: PatientProfileBlockProps) => (
    <View className="px-6 py-6 border-b border-gray-200">
        <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mr-5">
                <Icon icon={PATIENT_ICONS.account} size={40} color="#007AFF" />
            </View>

            <View className="flex-1 flex-row justify-between pr-4">
                <View>
                    <Text className="text-gray-700 text-[15px] mb-1">
                        <Text className="font-semibold">Name: </Text>{patient.patient_name}
                    </Text>
                    <Text className="text-gray-700 text-[15px]">
                        <Text className="font-semibold">Mobile: </Text>{patient.patient_mobile}
                    </Text>
                </View>
                <View>
                    <Text className="text-gray-700 text-[15px] mb-1">
                        <Text className="font-semibold">Age: </Text>{patient.age || 'N/A'}
                    </Text>
                    <Text className="text-gray-700 text-[15px]">
                        <Text className="font-semibold">Gender: </Text>{patient.gender || 'N/A'}
                    </Text>
                </View>
            </View>
        </View>

        <View className="flex-row items-center justify-between mt-8">
            <TouchableOpacity
                onPress={onEditProfile}
                className="bg-white border border-blue-500 px-6 py-2.5 rounded-full"
            >
                <Text className="text-[#007AFF] font-medium">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onStartConsultation}
                className="bg-blue-500 px-6 py-2.5 rounded-full"
            >
                <Text className="text-white font-medium">Start Consultation</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default PatientProfileBlock;
