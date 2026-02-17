import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { User } from '@/entities';
import { useTenant } from '@/hooks/useTenant';
import { AuthRepository, MasterDataRepository } from '@/repositories';
import type { MasterDataItem } from '@/repositories';
import { APP_ERROR_CODES, AppError } from '@/shared';
import { useSessionStore } from '@/stores/session-store';
import {
    CONSULTATION_SETTINGS_DATA,
    INITIAL_SECTIONS_ORDER,
    LIST_SECTIONS,
    SECTION_MAPPING,
} from '@/features/settings/constants';
import type { ListItem, SettingSection } from '@/features/settings/types';

export function useSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { doctorId } = useTenant();
    const sessionUser = useSessionStore((state) => state.user);

    const [activeSection, setActiveSection] = useState<SettingSection>('Procedure');

    const [items, setItems] = useState<MasterDataItem[]>([]);
    const [itemsCache, setItemsCache] = useState<Record<string, MasterDataItem[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [doctorUser, setDoctorUser] = useState<User | null>(sessionUser);

    const [sectionsOrder, setSectionsOrder] = useState<ListItem[]>(INITIAL_SECTIONS_ORDER);
    const [consultationSettings, setConsultationSettings] = useState(
        CONSULTATION_SETTINGS_DATA.reduce((acc, item) => ({ ...acc, [item.id]: item.default }), {} as Record<string, boolean>)
    );

    const loadData = useCallback(async (forceRefresh = false) => {
        const category = SECTION_MAPPING[activeSection];
        if (!category) return;

        if (!forceRefresh && itemsCache[category]) {
            setItems(itemsCache[category]);
            return;
        }

        setIsLoading(true);
        try {
            if (doctorId) {
                const data = await MasterDataRepository.getItems(category);
                setItems(data);
                setItemsCache((prev) => ({ ...prev, [category]: data }));
            }
        } catch (error) {
            if (__DEV__) console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeSection, doctorId, itemsCache]);

    useEffect(() => {
        setDoctorUser(sessionUser);
    }, [sessionUser]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleLogout = useCallback(async () => {
        try {
            await AuthRepository.logout();
            router.replace('/(auth)/login');
        } catch (error) {
            if (__DEV__) console.error('Logout failed:', error);
            router.replace('/(auth)/login');
        }
    }, [router]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    const openProfileModal = useCallback(() => {
        setIsProfileModalVisible(true);
    }, []);

    const closeProfileModal = useCallback(() => {
        setIsProfileModalVisible(false);
    }, []);

    const handleDoctorProfileSave = useCallback((updated: User) => {
        setDoctorUser(updated);
    }, []);

    const openAddModal = useCallback(() => {
        setEditingItem(null);
        setIsModalVisible(true);
    }, []);

    const openEditModal = useCallback((item: MasterDataItem) => {
        setEditingItem(item);
        setIsModalVisible(true);
    }, []);

    const closeItemModal = useCallback(() => {
        setIsModalVisible(false);
    }, []);

    const handleSaveItem = useCallback(async (value: string) => {
        const category = SECTION_MAPPING[activeSection];
        if (!category) return;

        if (!doctorId) return;

        try {
            if (editingItem) {
                await MasterDataRepository.updateItem(category, editingItem._id, value);
            } else {
                await MasterDataRepository.addItem(category, value);
            }
            await loadData(true);
        } catch (error) {
            if (__DEV__) console.error('Failed to save item:', error);
            Alert.alert('Error', 'Failed to save item');
        }
    }, [activeSection, doctorId, editingItem, loadData]);

    const handleDeleteItem = useCallback(async (id: string) => {
        const category = SECTION_MAPPING[activeSection];
        if (!category) return;

        Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    if (!doctorId) return;

                    try {
                        await MasterDataRepository.deleteItem(category, id);
                        const newItems = items.filter((i) => i._id !== id);
                        setItems(newItems);
                        setItemsCache((prev) => ({ ...prev, [category]: newItems }));
                    } catch (error) {
                        if (__DEV__) console.error('Failed to delete item:', error);
                        Alert.alert('Error', 'Failed to delete item');
                    }
                },
            },
        ]);
    }, [activeSection, doctorId, items]);

    const handleDeleteAll = useCallback(async () => {
        const category = SECTION_MAPPING[activeSection];
        if (!category) return;

        Alert.alert(
            'Delete All Items',
            `Are you sure you want to delete ALL items in ${activeSection}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            if (!doctorId) return;

                            const deletePromises = items.map((item) =>
                                MasterDataRepository.deleteItem(category, item._id)
                            );

                            const results = await Promise.allSettled(deletePromises);
                            const failed = results.filter((result) => result.status === 'rejected');
                            if (failed.length > 0) {
                                throw new AppError({
                                    code: APP_ERROR_CODES.PARTIAL_FAILURE,
                                    message: `Failed to delete ${failed.length} item(s).`,
                                    isRetryable: true,
                                    cause: failed,
                                });
                            }

                            setItems([]);
                            setItemsCache((prev) => ({ ...prev, [category]: [] }));
                            Alert.alert('Success', 'All items deleted successfully');
                        } catch (error) {
                            if (__DEV__) console.error('Error deleting all items:', error);
                            Alert.alert('Error', 'Failed to delete all items');
                        } finally {
                            setIsLoading(false);
                        }
                    },
                },
            ]
        );
    }, [activeSection, doctorId, items]);

    const toggleConsultationSetting = useCallback((id: string) => {
        setConsultationSettings((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const isListSection = useMemo(
        () => LIST_SECTIONS.includes(activeSection),
        [activeSection]
    );

    const editModalTitle = useMemo(
        () => `${editingItem ? 'Edit' : 'Add'} ${activeSection}`,
        [activeSection, editingItem]
    );

    return {
        insets,
        activeSection,
        setActiveSection,
        isListSection,
        items,
        isLoading,
        searchQuery,
        setSearchQuery,
        sectionsOrder,
        setSectionsOrder,
        consultationSettings,
        toggleConsultationSetting,
        loadData,
        handleDeleteItem,
        handleDeleteAll,
        openAddModal,
        openEditModal,
        isModalVisible,
        closeItemModal,
        handleSaveItem,
        editModalTitle,
        editingItem,
        handleClose,
        handleLogout,
        openProfileModal,
        closeProfileModal,
        isProfileModalVisible,
        doctorUser,
        handleDoctorProfileSave,
    };
}
