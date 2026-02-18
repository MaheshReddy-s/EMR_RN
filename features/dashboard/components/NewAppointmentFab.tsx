import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface NewAppointmentFabProps {
    visible: boolean;
    onPress: () => void;
}

const NewAppointmentFab = ({ visible, onPress }: NewAppointmentFabProps) => {
    const insets = useSafeAreaInsets();
    const isWeb = Platform.OS === 'web';
    if (!visible) return null;

    const fabSize = isWeb ? 48 : 56;

    return (
        <TouchableOpacity
            onPress={onPress}
            className="items-center justify-center"
            style={{
                position: 'absolute',
                right: isWeb ? 16 : 24,
                bottom: isWeb ? 20 : Math.max(insets.bottom + 16, 24),
                width: fabSize,
                height: fabSize,
                borderRadius: fabSize / 2,
                backgroundColor: '#2563EB',
                zIndex: 50,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
            }}
        >
            <Icon icon={DASHBOARD_ICONS.calendarPlus} size={isWeb ? 24 : 28} color="white" />
        </TouchableOpacity>
    );
};

export default NewAppointmentFab;
