import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { Appointment } from '@/features/dashboard/types';

interface AppointmentRowProps {
    item: Appointment;
    onPress: (item: Appointment) => void;
}

const AppointmentRow = React.memo(({ item, onPress }: AppointmentRowProps) => {
    const isWeb = Platform.OS === 'web';
    const isCompleted = item.status === 'completed';
    const statusColorClass = isCompleted ? 'bg-gray-400' : 'bg-blue-500';

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className={`flex-row items-center border-b border-gray-100 ${isCompleted ? 'opacity-60' : ''}`}
            style={{
                paddingVertical: isWeb ? 8 : 16,
                paddingHorizontal: isWeb ? 14 : 16,
                minHeight: isWeb ? 54 : 74,
            }}
        >
            <View
                style={{
                    borderColor: isCompleted ? '#D1D5DB' : '#007AFF',
                    borderWidth: isWeb ? 1.25 : 1.5,
                    width: isWeb ? 36 : 48,
                    height: isWeb ? 36 : 48,
                    borderRadius: isWeb ? 18 : 24,
                    marginRight: isWeb ? 12 : 16,
                }}
                className="bg-white items-center justify-center"
            >
                <Icon
                    icon={DASHBOARD_ICONS.person}
                    size={isWeb ? 24 : 32}
                    color={isCompleted ? '#9CA3AF' : '#007AFF'}
                />
            </View>
            <View className="flex-1">
                <Text
                    className={`font-semibold ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}
                    style={{ fontSize: isWeb ? 14 : 18 }}
                >
                    {item.patientName}
                </Text>
                <View className="flex-row items-center">
                    {item.type && (
                        <Text className="text-gray-400" style={{ fontSize: isWeb ? 12 : 16 }}>
                            {item.type}
                        </Text>
                    )}
                </View>
            </View>
            <View
                className={`flex-row items-center rounded-lg ${statusColorClass}`}
                style={{ paddingHorizontal: isWeb ? 6 : 8, paddingVertical: isWeb ? 4 : 8 }}
            >
                <Text className="text-white font-medium" style={{ fontSize: isWeb ? 12 : 16 }}>
                    {item.time}
                </Text>
                <Icon
                    icon={isCompleted ? DASHBOARD_ICONS.checkCircle : DASHBOARD_ICONS.chevronRight}
                    size={isWeb ? 16 : 20}
                    color="white"
                    style={{ marginLeft: isWeb ? 3 : 4 }}
                />
            </View>
        </TouchableOpacity>

    );
});

export default AppointmentRow;
