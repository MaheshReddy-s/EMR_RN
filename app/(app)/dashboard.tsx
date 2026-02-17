import React from 'react';
import { View } from 'react-native';
import NewAppointmentModal from '@/components/new-appointment-modal';
import RegisterModal from '@/components/register-modal';
import AppointmentsPanel from '@/features/dashboard/components/AppointmentsPanel';
import DashboardTabs from '@/features/dashboard/components/DashboardTabs';
import MobileHeader from '@/features/dashboard/components/MobileHeader';
import NewAppointmentFab from '@/features/dashboard/components/NewAppointmentFab';
import PatientsPanel from '@/features/dashboard/components/PatientsPanel';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';

export default function DashboardScreen() {
    const dashboard = useDashboard();

    const content = (
        <>
            <MobileHeader
                user={dashboard.user}
                appointmentsCount={dashboard.pendingAppointmentsCount}
                onSettingsPress={dashboard.handleSettingsPress}
            />

            <DashboardTabs
                activeTab={dashboard.activeTab}
                onTabChange={dashboard.setActiveTab}
            />

            <AppointmentsPanel
                activeTab={dashboard.activeTab}
                calendarWidth={dashboard.isWeb && dashboard.isLargeScreen ? Math.min(dashboard.width - 80, 880) : dashboard.width}
                selectedDate={dashboard.selectedDate}
                onDateSelect={dashboard.handleDateSelect}
                onMonthChange={dashboard.setVisibleMonth}
                onGoToToday={dashboard.goToToday}
                visibleMonth={dashboard.visibleMonth}
                query={dashboard.searchQuery}
                onSearchChange={dashboard.setSearchQuery}
                onSearchClear={dashboard.clearAppointmentsSearch}
                appointments={dashboard.filteredAppointments}
                isLoading={dashboard.isLoading}
                onAppointmentPress={dashboard.handleAppointmentPress}
            />

            <PatientsPanel
                activeTab={dashboard.activeTab}
                query={dashboard.searchQuery}
                onSearchChange={dashboard.handlePatientSearch}
                onSearchClear={dashboard.clearPatientsSearch}
                patients={dashboard.displayedPatients}
                isLoading={dashboard.isLoading}
                isFetchingMore={dashboard.isFetchingMore}
                onRefresh={dashboard.handleRefreshPatients}
                onEndReached={dashboard.handleLoadMorePatients}
                onMomentumScrollBegin={dashboard.handlePatientsMomentumScrollBegin}
                onPatientPress={dashboard.handlePatientPress}
            />

            <NewAppointmentFab
                visible={dashboard.shouldShowFab}
                onPress={dashboard.handleNewAppointment}
            />
        </>
    );

    if (dashboard.isWeb && dashboard.isLargeScreen) {
        return (
            <View className="flex-1 bg-white" style={{ alignItems: 'center' }}>
                <View style={{ width: '100%', maxWidth: 960, flex: 1, paddingHorizontal: 40, position: 'relative' }}>
                    {content}
                </View>

                <NewAppointmentModal
                    visible={dashboard.showNewAppointmentModal}
                    onClose={() => dashboard.setShowNewAppointmentModal(false)}
                    onCreateAppointment={dashboard.handleCreateAppointment}
                    onRegisterNew={dashboard.handleOpenRegistration}
                />

                <RegisterModal
                    visible={dashboard.showRegisterModal}
                    onClose={() => dashboard.setShowRegisterModal(false)}
                    initialData={dashboard.registerInitialData}
                    onRegister={dashboard.handleRegisterSuccess}
                />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white relative">
            {content}

            <NewAppointmentModal
                visible={dashboard.showNewAppointmentModal}
                onClose={() => dashboard.setShowNewAppointmentModal(false)}
                onCreateAppointment={dashboard.handleCreateAppointment}
                onRegisterNew={dashboard.handleOpenRegistration}
            />

            <RegisterModal
                visible={dashboard.showRegisterModal}
                onClose={() => dashboard.setShowRegisterModal(false)}
                initialData={dashboard.registerInitialData}
                onRegister={dashboard.handleRegisterSuccess}
            />
        </View>
    );
}
