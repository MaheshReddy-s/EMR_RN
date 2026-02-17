import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { PATIENT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface PatientScreenHeaderProps {
    onBack: () => void;
}

const PatientScreenHeader = ({ onBack }: PatientScreenHeaderProps) => (
    <View className="px-4 py-2 mt-4 flex-row items-center">
        <TouchableOpacity onPress={onBack} className="p-1">
            <Icon icon={PATIENT_ICONS.chevronLeft} size={28} color="#007AFF" />
        </TouchableOpacity>
    </View>
);

export default PatientScreenHeader;
