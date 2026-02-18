import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { User } from '@/entities';
import { useTenant } from '@/hooks/useTenant';
import { AuthRepository, MasterDataRepository } from '@/repositories';
import type { MasterDataItem } from '@/repositories';
import { APP_ERROR_CODES, AppError } from '@/shared';
import { useSessionStore } from '@/stores/session-store';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/constants/endpoints';
import {
    CONSULTATION_SETTINGS_DATA,
    INITIAL_SECTIONS_ORDER,
    LIST_SECTIONS,
    SECTION_MAPPING,
} from '@/features/settings/constants';
import type { AdvancedSettings, ListItem, SettingSection } from '@/features/settings/types';

const SECTION_LABEL_MAP: Record<string, string> = {
    complaints: 'Complaints',
    diagnosis: 'Diagnosis',
    examination: 'Examination',
    instruction: 'Instruction',
    investigation: 'Investigation',
    notes: 'Notes',
    prescriptions: 'Prescriptions',
    procedure: 'Procedure',
    vitals: 'Vitals',
};

const ALL_SECTION_KEYS = Object.keys(SECTION_LABEL_MAP);

export function useSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { doctorId, clinicId } = useTenant();
    const sessionUser = useSessionStore((state) => state.user);

    const [activeSection, setActiveSection] = useState<SettingSection>('Complaints');

    const [items, setItems] = useState<MasterDataItem[]>([]);
    const [itemsCache, setItemsCache] = useState<Record<string, MasterDataItem[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPrescriptionModalVisible, setIsPrescriptionModalVisible] = useState(false);
    const [currentPrescriptionData, setCurrentPrescriptionData] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [doctorUser, setDoctorUser] = useState<User | null>(sessionUser);

    const [sectionsOrder, setSectionsOrder] = useState<ListItem[]>(INITIAL_SECTIONS_ORDER);
    const settingsLoadedRef = useRef(false);
    const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
        pencil_thickness: 1,
        top_space: 110,
        bottom_space: 30,
        left_space: 70,
        right_space: 70,
        followup_window: 0,
        slot_duration: 15,
        doctor_details_in_consultation: true,
        patient_details_in_consultation: true,
        letterpad_header: true,
        letterpad_footer: false,
        complaints: true,
        diagnosis: true,
        examination: true,
        investigation: true,
        procedure: true,
        instruction: true,
        notes: true,
        prescriptions: true,
        numbers_for_prescriptions: true,
    });
    const [originalAdvancedSettings, setOriginalAdvancedSettings] = useState<AdvancedSettings | null>(null);
    const [isSavingAdvancedSettings, setIsSavingAdvancedSettings] = useState(false);

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

    // --- Doctor Settings (sections order + toggles) ---
    const loadDoctorSettings = useCallback(async () => {
        if (!clinicId || !doctorId || settingsLoadedRef.current) return;
        try {
            const url = API_ENDPOINTS.SETTINGS.GET(clinicId, doctorId);
            const settings: any = await api.get(url);
            console.log('[Settings] GET response:', JSON.stringify(settings, null, 2));

            if (!settings) return;

            const sequence: string[] = Array.isArray(settings.sections_sequence)
                ? settings.sections_sequence
                : ALL_SECTION_KEYS;

            const remaining = new Set<string>(ALL_SECTION_KEYS);
            const ordered: ListItem[] = [];

            for (const key of sequence) {
                if (remaining.has(key)) {
                    ordered.push({
                        id: `section-${key}`,
                        label: SECTION_LABEL_MAP[key] || key,
                        key,
                        enabled: settings[key] !== false,
                    });
                    remaining.delete(key);
                }
            }
            for (const key of remaining) {
                ordered.push({
                    id: `section-${key}`,
                    label: SECTION_LABEL_MAP[key] || key,
                    key,
                    enabled: settings[key] !== false,
                });
            }

            setSectionsOrder(ordered);

            const fetchedAdvanced: AdvancedSettings = {
                pencil_thickness: settings.pencil_thickness ?? 1,
                top_space: settings.top_space ?? 110,
                bottom_space: settings.bottom_space ?? 30,
                left_space: settings.left_space ?? 70,
                right_space: settings.right_space ?? 70,
                followup_window: settings.followup_window ?? 0,
                slot_duration: settings.slot_duration ?? 15,
                doctor_details_in_consultation: settings.doctor_details_in_consultation ?? true,
                patient_details_in_consultation: settings.patient_details_in_consultation ?? true,
                letterpad_header: settings.letterpad_header ?? true,
                letterpad_footer: settings.letterpad_footer ?? false,
                complaints: settings.complaints ?? true,
                diagnosis: settings.diagnosis ?? true,
                examination: settings.examination ?? true,
                investigation: settings.investigation ?? true,
                procedure: settings.procedure ?? true,
                instruction: settings.instruction ?? true,
                notes: settings.notes ?? true,
                prescriptions: settings.prescriptions ?? true,
                numbers_for_prescriptions: settings.numbers_for_prescriptions ?? true,
            };
            setAdvancedSettings(fetchedAdvanced);
            setOriginalAdvancedSettings(fetchedAdvanced);

            settingsLoadedRef.current = true;
        } catch (error) {
            if (__DEV__) console.error('[Settings] Failed to load:', error);
            settingsLoadedRef.current = true;
        }
    }, [clinicId, doctorId]);

    useEffect(() => {
        loadDoctorSettings();
    }, [loadDoctorSettings]);

    const saveFullSettings = useCallback(async (updates: Partial<AdvancedSettings>) => {
        if (!clinicId || !doctorId) return;
        try {
            const url = API_ENDPOINTS.SETTINGS.UPDATE(clinicId, doctorId);
            const current = advancedSettings;
            const payload: Record<string, any> = {
                ...current,
                ...updates,
                sections_sequence: sectionsOrder.map(s => s.key),
            };
            // Map section toggles
            for (const s of sectionsOrder) {
                payload[s.key] = s.enabled;
            }
            console.log('[Settings] Syncing settings:', JSON.stringify(payload, null, 2));
            await api.put(url, payload);
        } catch (error) {
            if (__DEV__) console.error('[Settings] Sync failed:', error);
        }
    }, [clinicId, doctorId, advancedSettings, sectionsOrder]);

    const saveSectionSettings = useCallback(async (sections: ListItem[]) => {
        if (!clinicId || !doctorId) return;
        try {
            const url = API_ENDPOINTS.SETTINGS.UPDATE(clinicId, doctorId);
            const payload: Record<string, any> = {
                ...advancedSettings,
                sections_sequence: sections.map(s => s.key),
            };
            for (const s of sections) {
                payload[s.key] = s.enabled;
            }
            console.log('[Settings] Save Sections payload:', JSON.stringify(payload, null, 2));
            await api.put(url, payload);
        } catch (error) {
            if (__DEV__) console.error('[Settings] Failed to save sections:', error);
            Alert.alert('Error', 'Failed to save section settings');
        }
    }, [clinicId, doctorId, advancedSettings]);

    const handleSectionsOrderChange = useCallback((next: ListItem[]) => {
        setSectionsOrder(next);
        saveSectionSettings(next);
    }, [saveSectionSettings]);

    const handleToggleSection = useCallback((key: string) => {
        setSectionsOrder(prev => {
            const updated = prev.map(item =>
                item.key === key ? { ...item, enabled: !item.enabled } : item
            );
            saveSectionSettings(updated);
            return updated;
        });
    }, [saveSectionSettings]);

    const handleAdvancedSettingChange = useCallback((key: keyof AdvancedSettings, value: any) => {
        setAdvancedSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const isAdvancedSettingsDirty = useMemo(() => {
        if (!originalAdvancedSettings) return false;
        return JSON.stringify(advancedSettings) !== JSON.stringify(originalAdvancedSettings);
    }, [advancedSettings, originalAdvancedSettings]);

    const handleSaveAdvancedSettings = useCallback(async () => {
        if (!clinicId || !doctorId) return;
        setIsSavingAdvancedSettings(true);
        try {
            const url = API_ENDPOINTS.SETTINGS.UPDATE(clinicId, doctorId);

            // Construct full payload to avoid overwriting sections order/toggles
            const payload: Record<string, any> = {
                ...advancedSettings,
                sections_sequence: sectionsOrder.map(s => s.key),
            };
            for (const s of sectionsOrder) {
                payload[s.key] = s.enabled;
            }

            console.log('[Settings] Save Advanced payload:', JSON.stringify(payload, null, 2));
            await api.put(url, payload);

            setOriginalAdvancedSettings(advancedSettings);
            Alert.alert('Success', 'Settings updated successfully');
        } catch (error) {
            if (__DEV__) console.error('[Settings] Failed to save advanced:', error);
            Alert.alert('Error', 'Failed to update settings');
        } finally {
            setIsSavingAdvancedSettings(false);
        }
    }, [clinicId, doctorId, advancedSettings, sectionsOrder]);

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
        if (activeSection === 'Prescriptions') {
            const rawData = (item as any).fullData || {};
            setCurrentPrescriptionData({
                brandName: rawData.brand_name || item.name,
                genericName: rawData.generic_name || '',
                variants: rawData.variants || [],
            });
            setEditingItem(item);
            setIsPrescriptionModalVisible(true);
        } else {
            setEditingItem(item);
            setIsModalVisible(true);
        }
    }, [activeSection]);

    const closeItemModal = useCallback(() => {
        setIsModalVisible(false);
        setIsPrescriptionModalVisible(false);
    }, []);

    const handleSaveItem = useCallback(async (value: string | any) => {
        const category = SECTION_MAPPING[activeSection];
        if (!category) return;

        if (!doctorId) return;

        try {
            if (activeSection === 'Prescriptions' && typeof value === 'object') {
                // Handle rich prescription data from PrescriptionModal
                if (editingItem) {
                    await MasterDataRepository.updateItem(category, editingItem._id, {
                        medicine_name: value.brandName,
                        brand_name: value.brandName,
                        generic_name: value.genericName,
                        variants: value.variants
                    } as any);
                } else {
                    await MasterDataRepository.addItem(category, {
                        medicine_name: value.brandName,
                        brand_name: value.brandName,
                        generic_name: value.genericName,
                        variants: value.variants
                    } as any);
                }
            } else {
                // Handle simple string value
                if (editingItem) {
                    await MasterDataRepository.updateItem(category, editingItem._id, value as string);
                } else {
                    await MasterDataRepository.addItem(category, value as string);
                }
            }
            await loadData(true);
            setIsModalVisible(false);
            setIsPrescriptionModalVisible(false);
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

    const toggleConsultationSetting = useCallback((key: string) => {
        setAdvancedSettings((prev) => {
            const newVal = !prev[key as keyof AdvancedSettings];
            const updated = { ...prev, [key]: newVal };
            saveFullSettings({ [key]: newVal });
            return updated;
        });
    }, [saveFullSettings]);

    const isListSection = useMemo(
        () => LIST_SECTIONS.includes(activeSection),
        [activeSection]
    );

    const editModalTitle = useMemo(
        () => `${editingItem ? 'Edit' : 'Add'} ${activeSection}`,
        [activeSection, editingItem]
    );

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item => {
            const raw = (item as any).fullData || {};
            const searchContent = [
                item.name,
                raw.brand_name,
                raw.generic_name,
                raw.property_value
            ].filter(Boolean).map(s => s.toLowerCase());

            return searchContent.some(s => s.includes(query));
        });
    }, [items, searchQuery]);

    return {
        insets,
        activeSection,
        setActiveSection,
        isListSection,
        items: filteredItems,
        isLoading,
        searchQuery,
        setSearchQuery,
        sectionsOrder,
        setSectionsOrder: handleSectionsOrderChange,
        handleToggleSection,
        consultationSettings: advancedSettings,
        toggleConsultationSetting,
        loadData,
        handleDeleteItem,
        handleDeleteAll,
        openAddModal,
        openEditModal,
        isModalVisible,
        isPrescriptionModalVisible,
        currentPrescriptionData,
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
        advancedSettings,
        handleAdvancedSettingChange,
        handleSaveAdvancedSettings,
        isAdvancedSettingsDirty,
        isSavingAdvancedSettings,
    };
}
