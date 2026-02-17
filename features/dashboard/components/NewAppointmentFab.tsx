import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface NewAppointmentFabProps {
    visible: boolean;
    onPress: () => void;
}

const NewAppointmentFab = ({ visible, onPress }: NewAppointmentFabProps) => {
    const insets = useSafeAreaInsets();
    if (!visible) return null;

    return (
        <TouchableOpacity
            onPress={onPress}
            className="items-center justify-center"
            style={{
                position: 'absolute',
                right: 24,
                bottom: Math.max(insets.bottom + 16, 24),
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#2563EB',
                zIndex: 50,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
            }}
        >
            <Icon icon={DASHBOARD_ICONS.calendarPlus} size={28} color="white" />
        </TouchableOpacity>
    );
};

export default NewAppointmentFab;
