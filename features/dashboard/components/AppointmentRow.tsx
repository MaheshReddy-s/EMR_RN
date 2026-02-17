import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { Appointment } from '@/features/dashboard/types';

interface AppointmentRowProps {
    item: Appointment;
    onPress: (item: Appointment) => void;
}

const AppointmentRow = React.memo(({ item, onPress }: AppointmentRowProps) => {
    const isCompleted = item.status === 'completed';
    const statusColorClass = isCompleted ? 'bg-gray-400' : 'bg-blue-500';

    return (
        <TouchableOpacity
            onPress={() => onPress(item)}
            className={`flex-row items-center py-4 px-4 border-b border-gray-100 ${isCompleted ? 'opacity-60' : ''}`}
        >
            <View
                style={{
                    borderColor: isCompleted ? '#D1D5DB' : '#007AFF',
                    borderWidth: 1.5,
                }}
                className="w-12 h-12 rounded-full bg-white items-center justify-center mr-4"
            >
                <Icon
                    icon={DASHBOARD_ICONS.person}
                    size={32}
                    color={isCompleted ? '#9CA3AF' : '#007AFF'}
                />
            </View>
            <View className="flex-1">
                <Text className={`text-lg font-semibold ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>
                    {item.patientName}
                </Text>
                <View className="flex-row items-center">
                    {item.type && <Text className="text-base text-gray-400">{item.type}</Text>}
                </View>
            </View>
            <View className={`flex-row items-center px-2 py-2 rounded-lg ${statusColorClass}`}>
                <Text className="text-white text-base font-medium">{item.time}</Text>
                <Icon
                    icon={isCompleted ? DASHBOARD_ICONS.checkCircle : DASHBOARD_ICONS.chevronRight}
                    size={20}
                    color="white"
                    style={{ marginLeft: 4 }}
                />
            </View>
        </TouchableOpacity>
    );
});

export default AppointmentRow;
