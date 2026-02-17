import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useRenderCountGuard } from '@/hooks/useRenderCountGuard';
import CalendarStrip from '@/features/dashboard/components/CalendarStrip';
import SearchBar from '@/features/dashboard/components/SearchBar';
import AppointmentRow from '@/features/dashboard/components/AppointmentRow';
import type { Appointment, DashboardTab } from '@/features/dashboard/types';

interface AppointmentsPanelProps {
    activeTab: DashboardTab;
    calendarWidth: number;
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    onMonthChange: (month: string) => void;
    onGoToToday: () => void;
    visibleMonth: string;
    query: string;
    onSearchChange: (text: string) => void;
    onSearchClear: () => void;
    appointments: Appointment[];
    isLoading: boolean;
    onAppointmentPress: (item: Appointment) => void;
}

const AppointmentsPanel = ({
    activeTab,
    calendarWidth,
    selectedDate,
    onDateSelect,
    onMonthChange,
    onGoToToday,
    visibleMonth,
    query,
    onSearchChange,
    onSearchClear,
    appointments,
    isLoading,
    onAppointmentPress,
}: AppointmentsPanelProps) => {
    useRenderCountGuard('AppointmentsPanel');

    return (
        <View style={{ display: activeTab === 'appointments' ? 'flex' : 'none', flex: 1 }}>
            <CalendarStrip
                width={calendarWidth}
                selectedDate={selectedDate}
                onDateSelect={onDateSelect}
                onMonthChange={onMonthChange}
                onGoToToday={onGoToToday}
                visibleMonth={visibleMonth}
            />
            <SearchBar
                query={query}
                onChange={onSearchChange}
                onClear={onSearchClear}
                isActiveTabPatients={false}
            />
            <FlatList
                data={appointments}
                renderItem={({ item }) => <AppointmentRow item={item} onPress={onAppointmentPress} />}
                keyExtractor={(item) => item.id}
                className="flex-1 bg-white"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Text style={{ fontSize: 17, fontWeight: '600', color: '#8E8E93' }}>No Appointments</Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={appointments.length === 0 ? { flexGrow: 1 } : undefined}
            />
        </View>
    );
};

export default AppointmentsPanel;
