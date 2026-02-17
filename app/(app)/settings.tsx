import React from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DoctorProfileModal } from '@/components/settings/DoctorProfileModal';
import SettingsContent from '@/features/settings/components/SettingsContent';
import SettingsSidebar from '@/features/settings/components/SettingsSidebar';
import { useSettings } from '@/features/settings/hooks/useSettings';

export default function SettingsScreen() {
    const settings = useSettings();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={Platform.OS === 'web' ? { flex: 1, alignItems: 'center', backgroundColor: 'white' } : { flex: 1 }}>
                <View className="flex-1 flex-row bg-white" style={Platform.OS === 'web' ? { width: '100%', maxWidth: 960 } : {}}>
                    <SettingsSidebar
                        activeSection={settings.activeSection}
                        onSectionChange={settings.setActiveSection}
                        onClose={settings.handleClose}
                        topInset={settings.insets.top}
                    />

                    <View className="flex-1 bg-white" style={{ paddingTop: settings.insets.top }}>
                        <SettingsContent
                            activeSection={settings.activeSection}
                            isListSection={settings.isListSection}
                            items={settings.items}
                            isLoading={settings.isLoading}
                            isModalVisible={settings.isModalVisible}
                            modalTitle={settings.editModalTitle}
                            editingItem={settings.editingItem}
                            sectionsOrder={settings.sectionsOrder}
                            consultationSettings={settings.consultationSettings}
                            onProfilePress={settings.openProfileModal}
                            onLogoutPress={settings.handleLogout}
                            onOpenAddModal={settings.openAddModal}
                            onOpenEditModal={settings.openEditModal}
                            onCloseModal={settings.closeItemModal}
                            onSaveItem={settings.handleSaveItem}
                            onDeleteItem={settings.handleDeleteItem}
                            onDeleteAll={settings.handleDeleteAll}
                            onRefresh={settings.loadData}
                            onSectionsOrderChange={settings.setSectionsOrder}
                            onToggleConsultationSetting={settings.toggleConsultationSetting}
                        />
                    </View>
                </View>
            </View>

            <DoctorProfileModal
                visible={settings.isProfileModalVisible}
                onClose={settings.closeProfileModal}
                user={settings.doctorUser}
                onSave={settings.handleDoctorProfileSave}
            />
        </GestureHandlerRootView>
    );
}
