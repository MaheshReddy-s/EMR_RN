import React from 'react';
import { FlatList, Platform, Text, View } from 'react-native';
import { useRenderCountGuard } from '@/hooks/useRenderCountGuard';
import SearchBar from '@/features/dashboard/components/SearchBar';
import PatientRow from '@/features/dashboard/components/PatientRow';
import type { DashboardTab } from '@/features/dashboard/types';
import type { Patient } from '@/entities';

interface PatientsPanelProps {
    activeTab: DashboardTab;
    query: string;
    onSearchChange: (text: string) => void;
    onSearchClear: () => void;
    patients: Patient[];
    isLoading: boolean;
    isFetchingMore: boolean;
    onRefresh: () => void;
    onEndReached: () => void;
    onMomentumScrollBegin: () => void;
    onPatientPress: (patient: Patient) => void;
}

const PatientsPanel = ({
    activeTab,
    query,
    onSearchChange,
    onSearchClear,
    patients,
    isLoading,
    isFetchingMore,
    onRefresh,
    onEndReached,
    onMomentumScrollBegin,
    onPatientPress,
}: PatientsPanelProps) => {
    const isWeb = Platform.OS === 'web';

    return (
        <View style={{ display: activeTab === 'all-patients' ? 'flex' : 'none', flex: 1 }}>
            <SearchBar
                query={query}
                onChange={onSearchChange}
                onClear={onSearchClear}
                isActiveTabPatients
            />
            <FlatList
                data={patients}
                renderItem={({ item }) => <PatientRow item={item} onPress={onPatientPress} />}
                keyExtractor={(item) => item._id}
                className="flex-1 bg-white"
                showsVerticalScrollIndicator
                refreshing={isLoading}
                onRefresh={onRefresh}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.1}
                onMomentumScrollBegin={onMomentumScrollBegin}
                ListEmptyComponent={
                    !isLoading ? (
                        <View className={`flex-1 items-center justify-center ${isWeb ? 'py-10' : 'py-20'}`}>
                            <Text style={{ fontSize: isWeb ? 15 : 17, fontWeight: '600', color: '#8E8E93' }}>No Patients</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    isFetchingMore ? (
                        <View className={`${isWeb ? 'py-2' : 'py-4'} items-center`}>
                            <Text className="text-gray-400">Loading more...</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

export default PatientsPanel;
