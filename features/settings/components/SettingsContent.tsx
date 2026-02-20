import React from 'react';
import AdvancedSettingsSection, { AdvancedSettingsComponentProps } from '@/features/settings/components/AdvancedSettingsSection';
import ConsultationSettingsSection from '@/features/settings/components/ConsultationSettingsSection';
import ComingSoonSection from '@/features/settings/components/ComingSoonSection';
import MasterDataSection from '@/features/settings/components/MasterDataSection';
import SectionsOrderSection from '@/features/settings/components/SectionsOrderSection';
import type { PrescriptionData } from '@/entities/consultation/types';
import type { AdvancedSettings, ListItem, SettingSection } from '@/features/settings/types';
import type { MasterDataItem } from '@/repositories';

interface SettingsContentProps {
    activeSection: SettingSection;
    isListSection: boolean;
    items: MasterDataItem[];
    isLoading: boolean;
    isModalVisible: boolean;
    modalTitle: string;
    editingItem: MasterDataItem | null;
    sectionsOrder: ListItem[];
    consultationSettings: AdvancedSettings;
    onProfilePress: () => void;
    onLogoutPress: () => void;
    onOpenAddModal: () => void;
    onOpenEditModal: (item: MasterDataItem) => void;
    onCloseModal: () => void;
    onSaveItem: (value: string | any) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
    onDeleteAll: () => Promise<void>;
    onRefresh: () => Promise<void>;
    onSectionsOrderChange: (next: ListItem[]) => void;
    onToggleSection: (key: string) => void;
    onToggleConsultationSetting: (id: string) => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    advancedSettings: AdvancedSettingsComponentProps;
    isPrescriptionModalVisible: boolean;
    currentPrescriptionData: PrescriptionData | null;
}

const SettingsContent = ({
    activeSection,
    isListSection,
    items,
    isLoading,
    isModalVisible,
    modalTitle,
    editingItem,
    sectionsOrder,
    consultationSettings,
    onProfilePress,
    onLogoutPress,
    onOpenAddModal,
    onOpenEditModal,
    onCloseModal,
    onSaveItem,
    onDeleteItem,
    onDeleteAll,
    onRefresh,
    onSectionsOrderChange,
    onToggleSection,
    onToggleConsultationSetting,
    searchQuery,
    onSearchQueryChange,
    advancedSettings,
    isPrescriptionModalVisible,
    currentPrescriptionData,
}: SettingsContentProps) => {
    if (activeSection === 'Advanced Settings') {
        return (
            <AdvancedSettingsSection
                {...advancedSettings}
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
            />
        );
    }

    if (activeSection === 'Sections') {
        return (
            <SectionsOrderSection
                sectionsOrder={sectionsOrder}
                onSectionsOrderChange={onSectionsOrderChange}
                onToggleSection={onToggleSection}
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
            />
        );
    }

    if (activeSection === 'Consultation Settings') {
        return (
            <ConsultationSettingsSection
                settings={consultationSettings}
                onToggle={onToggleConsultationSetting}
                onProfilePress={onProfilePress}
                onLogoutPress={onLogoutPress}
            />
        );
    }

    if (!isListSection) {
        return <ComingSoonSection section={activeSection} />;
    }

    return (
        <MasterDataSection
            activeSection={activeSection}
            items={items}
            isLoading={isLoading}
            isModalVisible={isModalVisible}
            modalTitle={modalTitle}
            editingItem={editingItem}
            onProfilePress={onProfilePress}
            onLogoutPress={onLogoutPress}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            onCloseModal={onCloseModal}
            onSaveItem={onSaveItem}
            onDeleteItem={onDeleteItem}
            onDeleteAll={onDeleteAll}
            onRefresh={onRefresh}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            isPrescriptionModalVisible={isPrescriptionModalVisible}
            currentPrescriptionData={currentPrescriptionData}
        />
    );
};

export default SettingsContent;
