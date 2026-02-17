import React from 'react';
import AdvancedSettingsSection from '@/features/settings/components/AdvancedSettingsSection';
import ConsultationSettingsSection from '@/features/settings/components/ConsultationSettingsSection';
import ComingSoonSection from '@/features/settings/components/ComingSoonSection';
import MasterDataSection from '@/features/settings/components/MasterDataSection';
import SectionsOrderSection from '@/features/settings/components/SectionsOrderSection';
import type { SettingSection } from '@/features/settings/types';
import type { ListItem } from '@/features/settings/types';
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
    consultationSettings: Record<string, boolean>;
    onProfilePress: () => void;
    onLogoutPress: () => void;
    onOpenAddModal: () => void;
    onOpenEditModal: (item: MasterDataItem) => void;
    onCloseModal: () => void;
    onSaveItem: (value: string) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
    onDeleteAll: () => Promise<void>;
    onRefresh: () => Promise<void>;
    onSectionsOrderChange: (next: ListItem[]) => void;
    onToggleConsultationSetting: (id: string) => void;
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
    onToggleConsultationSetting,
}: SettingsContentProps) => {
    if (activeSection === 'Advanced Settings') {
        return (
            <AdvancedSettingsSection
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
        />
    );
};

export default SettingsContent;
