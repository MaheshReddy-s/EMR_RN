import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { User } from '@/entities';

interface MobileHeaderProps {
    user: User | null;
    appointmentsCount: number;
    onSettingsPress: () => void;
}

const MobileHeader = ({ user, appointmentsCount, onSettingsPress }: MobileHeaderProps) => (
    <View className="bg-white border-b border-gray-200 pt-12 pb-4 px-4">
        <View className="flex-row items-center justify-between">
            <View className="w-24" />
            <Text className="text-3xl font-bold text-gray-800 -mt-10 tracking-widest">AVANCE</Text>
            <View className="flex-row items-center gap-5">
                <TouchableOpacity
                    className="flex-row items-center px-3 py-1"
                    style={{ borderRadius: 5, borderWidth: 1, borderColor: '#8E8E93' }}
                    onPress={onSettingsPress}
                >
                    <Icon icon={DASHBOARD_ICONS.settings} size={18} color="#8E8E93" />
                    <Text style={{ color: '#8E8E93', fontSize: 15, marginLeft: 4 }}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center px-3 py-1"
                    style={{ borderRadius: 5, borderWidth: 1, borderColor: '#8E8E93' }}
                >
                    <Icon icon={DASHBOARD_ICONS.helpOutline} size={18} color="#8E8E93" />
                    <Text style={{ color: '#8E8E93', fontSize: 15, marginLeft: 4 }}>Help</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View className="flex-row items-center mt-8">
            <View
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 20,
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
            >
                <Icon icon={DASHBOARD_ICONS.person} size={48} color="#8E8E93" />
            </View>

            <View className="flex-1">
                <View className="flex-row items-baseline">
                    <Text style={{ fontWeight: '600', fontSize: 17, color: '#000' }}>
                        {user ? (user.first_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()) : 'Doctor'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#8E8E93', marginLeft: 8 }}>
                        {user?.qualification || ''}
                    </Text>
                </View>

                <Text style={{ fontSize: 15, color: '#8E8E93', marginTop: 8 }}>
                    You have {appointmentsCount} appointments today
                </Text>
            </View>
        </View>
    </View>
);

export default MobileHeader;
