import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { Patient } from '@/entities';

interface PatientRowProps {
    item: Patient;
    onPress: (item: Patient) => void;
}

const PatientRow = React.memo(({ item, onPress }: PatientRowProps) => {
    const isWeb = Platform.OS === 'web';

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            activeOpacity={0.7}
            style={{ paddingHorizontal: 16, paddingVertical: isWeb ? 2 : 4 }}
        >
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 5,
                borderWidth: 0.5,
                borderColor: '#D1D1D6',
                backgroundColor: '#FFFFFF',
                paddingVertical: isWeb ? 6 : 10,
                paddingHorizontal: isWeb ? 15 : 20,
                height: isWeb ? 50 : 62,
            }}>
                <View
                    style={{
                        width: isWeb ? 36 : 48,
                        height: isWeb ? 36 : 48,
                        borderRadius: isWeb ? 18 : 24,
                        borderWidth: isWeb ? 1 : 1.5,
                        borderColor: '#007AFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: isWeb ? 12 : 20,
                    }}
                >
                    <Icon icon={DASHBOARD_ICONS.person} size={isWeb ? 24 : 32} color="#007AFF" />
                </View>
                <View className="flex-1">
                    <Text style={{ fontWeight: '600', fontSize: isWeb ? 15 : 17, color: '#000' }}>{item.patient_name}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default PatientRow;
