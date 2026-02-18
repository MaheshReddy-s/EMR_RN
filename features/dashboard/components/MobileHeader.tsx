import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import type { User } from '@/entities';

interface MobileHeaderProps {
    user: User | null;
    appointmentsCount: number;
    onSettingsPress: () => void;
}

const MobileHeader = ({ user, appointmentsCount, onSettingsPress }: MobileHeaderProps) => {
    const isWeb = Platform.OS === 'web';

    return (
        <View
            className="bg-white border-b border-gray-200"
            style={{
                paddingTop: isWeb ? 16 : 48,
                paddingBottom: isWeb ? 12 : 16,
                paddingHorizontal: 16,
            }}
        >
            <View className="flex-row items-center justify-end">

                {/* Centered Title */}
                <Text
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        top: isWeb ? 0 : -30,
                        fontSize: isWeb ? 18 : 22,
                        fontWeight: '600',
                        color: '#374151',
                    }}
                >
                    AVANCE
                </Text>

                {/* Right Buttons */}
                <View className="flex-row items-center" style={{ marginTop: isWeb ? 0 : -16 }}>
                    <TouchableOpacity
                        className="flex-row items-center px-3 py-1 mr-4"
                        style={{ borderRadius: 5, borderWidth: 1, borderColor: '#8E8E93', height: isWeb ? 32 : 36 }}
                        onPress={onSettingsPress}
                    >
                        <Icon icon={DASHBOARD_ICONS.settings} size={isWeb ? 16 : 18} color="#8E8E93" />
                        <Text style={{ color: '#8E8E93', fontSize: isWeb ? 16 : 18, marginLeft: 4 }}>
                            Settings
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center px-3 py-1"
                        style={{ borderRadius: 5, borderWidth: 1, borderColor: '#8E8E93', height: isWeb ? 32 : 36 }}
                    >
                        <Icon icon={DASHBOARD_ICONS.helpOutline} size={isWeb ? 16 : 18} color="#8E8E93" />
                        <Text style={{ color: '#8E8E93', fontSize: isWeb ? 16 : 18, marginLeft: 4 }}>
                            Help
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>


            <View className="flex-row items-center" style={{ marginTop: isWeb ? 16 : 32 }}>
                <View
                    style={{
                        width: isWeb ? 60 : 80,
                        height: isWeb ? 60 : 80,
                        borderRadius: isWeb ? 30 : 40,
                        backgroundColor: '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: isWeb ? 16 : 20,
                        overflow: 'hidden',
                        flexShrink: 0,
                    }}
                >
                    <Icon icon={DASHBOARD_ICONS.person} size={isWeb ? 36 : 48} color="#8E8E93" />
                </View>

                <View className="flex-1">
                    <View className="flex-row items-baseline">
                        <Text style={{ fontWeight: '600', fontSize: isWeb ? 16 : 17, color: '#000' }}>
                            {user ? (user.first_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()) : 'Doctor'}
                        </Text>
                        <Text style={{ fontSize: isWeb ? 12 : 13, color: '#8E8E93', marginLeft: 8 }}>
                            {user?.qualification || ''}
                        </Text>
                    </View>

                    <Text style={{ fontSize: isWeb ? 14 : 15, color: '#8E8E93', marginTop: isWeb ? 4 : 8 }}>
                        You have {appointmentsCount} appointments today
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default MobileHeader;
