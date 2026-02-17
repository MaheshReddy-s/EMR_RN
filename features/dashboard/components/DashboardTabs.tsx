import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { DashboardTab } from '@/features/dashboard/types';

interface DashboardTabsProps {
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
}

const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', height: 50, borderBottomWidth: 0.5, borderBottomColor: '#8E8E93' }}>
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
                fontSize: 17,
                fontWeight: activeTab === 'appointments' ? '600' : '400',
                color: activeTab === 'appointments' ? '#000' : '#8E8E93',
            }}
            >
                Appointments
            </Text>
        </TouchableOpacity>
        <View style={{ width: 0.5, backgroundColor: '#8E8E93', marginVertical: 8 }} />
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
                fontSize: 17,
                fontWeight: activeTab === 'all-patients' ? '600' : '400',
                color: activeTab === 'all-patients' ? '#000' : '#8E8E93',
            }}
            >
                All Patients
            </Text>
        </TouchableOpacity>
    </View>
);

export default DashboardTabs;
