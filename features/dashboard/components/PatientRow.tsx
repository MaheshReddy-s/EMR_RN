import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { Patient } from '@/entities';

interface PatientRowProps {
    item: Patient;
    onPress: (item: Patient) => void;
}

const PatientRow = React.memo(({ item, onPress }: PatientRowProps) => (
    <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        style={{ paddingHorizontal: 16, paddingVertical: 4 }}
    >
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 5,
            borderWidth: 0.5,
            borderColor: '#D1D1D6',
            backgroundColor: '#FFFFFF',
            paddingVertical: 10,
            paddingHorizontal: 20,
            height: 62,
        }}>
            <View
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: '#007AFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 20,
                }}
            >
                <Icon icon={DASHBOARD_ICONS.person} size={32} color="#007AFF" />
            </View>
            <View className="flex-1">
                <Text style={{ fontWeight: '600', fontSize: 17, color: '#000' }}>{item.patient_name}</Text>
                <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 2 }}>{item.patient_mobile}</Text>
            </View>
        </View>
    </TouchableOpacity>
));

export default PatientRow;
