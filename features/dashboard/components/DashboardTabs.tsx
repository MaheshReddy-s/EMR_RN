import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import type { DashboardTab } from '@/features/dashboard/types';

interface DashboardTabsProps {
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
}

const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
    const isWeb = Platform.OS === 'web';

    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            height: isWeb ? 40 : 50,
            borderBottomWidth: 0.5,
            borderBottomColor: '#8E8E93',
        }}
        >
            <TouchableOpacity
                onPress={() => onTabChange('appointments')}
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottomWidth: activeTab === 'appointments' ? 2 : 0,
                    borderBottomColor: '#007AFF',
                }}
            >
                <Text style={{
                    fontSize: isWeb ? 15 : 17,
                    fontWeight: activeTab === 'appointments' ? '600' : '400',
                    color: activeTab === 'appointments' ? '#000' : '#8E8E93',
                }}
                >
                    Appointments
                </Text>
            </TouchableOpacity>
            <View style={{ width: 0.5, backgroundColor: '#8E8E93', marginVertical: isWeb ? 6 : 8 }} />
            <TouchableOpacity
                onPress={() => onTabChange('all-patients')}
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottomWidth: activeTab === 'all-patients' ? 2 : 0,
                    borderBottomColor: '#007AFF',
                }}
            >
                <Text style={{
                    fontSize: isWeb ? 15 : 17,
                    fontWeight: activeTab === 'all-patients' ? '600' : '400',
                    color: activeTab === 'all-patients' ? '#000' : '#8E8E93',
                }}
                >
                    All Patients
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default DashboardTabs;
