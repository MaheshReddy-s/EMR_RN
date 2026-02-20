import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { PrescriptionData, PrescriptionVariant } from '@/entities/consultation/types';
import {
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
const TIMING_LETTERS = ['M', 'A', 'E', 'N'] as const;
const MIN_PENCIL_THICKNESS = 1;
const MAX_PENCIL_THICKNESS = 50;

function normalizePencilThickness(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return MIN_PENCIL_THICKNESS;
    return Math.max(MIN_PENCIL_THICKNESS, Math.min(MAX_PENCIL_THICKNESS, Math.round(parsed)));
}

function normalizeTimings(rawValue: unknown): string {
    const raw = typeof rawValue === 'number'
        ? String(rawValue)
        : (typeof rawValue === 'string' ? rawValue : '');

    const source = raw.trim().toUpperCase();
    if (!source) return 'M-A-E-N';

    const parts = source.split('-');
    if (parts.length === 4) {
        return parts.map((part, index) => {
            const value = part.trim();
            const slot = TIMING_LETTERS[index];
            if (value === slot || value === '1') return slot;
            if (value === '0' || value === 'O' || value === '' || value === '-') return '-';
            return TIMING_LETTERS.includes(value as any) ? value : '-';
        }).join('-');
    }

    if (/^[01]{4}$/.test(source)) {
        return source
            .split('')
            .map((value, index) => (value === '1' ? TIMING_LETTERS[index] : '-'))
            .join('-');
    }

    return TIMING_LETTERS
        .map((slot) => (source.includes(slot) ? slot : '-'))
        .join('-');
}

function mapVariantToModal(rawVariant: Record<string, any>, index: number): PrescriptionVariant {
    const quantity = rawVariant.quantity !== undefined && rawVariant.quantity !== null
        ? String(rawVariant.quantity).trim()
        : '';
    const units = typeof rawVariant.units === 'string' ? rawVariant.units.trim() : '';

    let dosage = typeof rawVariant.dosage === 'string' ? rawVariant.dosage : '';
    if (!dosage && quantity) {
        dosage = `${quantity}${units && units !== 'N/A' ? ` ${units}` : ''}`.trim();
    }
    if (!dosage) dosage = 'N/A';

    const rawDuration = rawVariant.duration !== undefined && rawVariant.duration !== null
        ? String(rawVariant.duration).trim()
        : '';
    const duration = rawDuration && /^\d+$/.test(rawDuration)
        ? `${rawDuration} Days`
        : (rawDuration || '15 Days');

    return {
        id: String(rawVariant.variant_id || rawVariant._id || rawVariant.id || `${Date.now()}-${index}`),
        timings: normalizeTimings(rawVariant.timings || rawVariant.frequency || rawVariant.time),
        dosage,
        duration,
        type: String(rawVariant.medicine_type || rawVariant.type || 'Tablet'),
        instructions: typeof rawVariant.instructions === 'string' ? rawVariant.instructions : '',
        purchaseCount: typeof rawVariant.purchaseCount === 'string'
            ? rawVariant.purchaseCount
            : (typeof rawVariant.purchase_count === 'string' ? rawVariant.purchase_count : undefined),
    };
}

function mapItemToPrescriptionData(item: MasterDataItem): PrescriptionData {
    const rawData = item.fullData || {};
    const rawVariants = Array.isArray(rawData.variants) ? rawData.variants : [];

    return {
        brandName: typeof rawData.brand_name === 'string' && rawData.brand_name.trim()
            ? rawData.brand_name
            : item.name,
        genericName: typeof rawData.generic_name === 'string' ? rawData.generic_name : '',
        variants: rawVariants.length > 0
            ? rawVariants
                .filter((variant): variant is Record<string, any> => typeof variant === 'object' && variant !== null)
                .map((variant, index) => mapVariantToModal(variant, index))
            : [{
                id: Date.now().toString(),
                timings: 'M-A-E-N',
                dosage: 'N/A',
                duration: '15 Days',
                type: 'Tablet',
            }],
    };
}

function isPrescriptionData(value: unknown): value is PrescriptionData {
    if (typeof value !== 'object' || value === null) return false;
    return typeof (value as PrescriptionData).brandName === 'string' &&
        Array.isArray((value as PrescriptionData).variants);
}

function toPrescriptionPayload(value: PrescriptionData): Record<string, any> {
    return {
        medicine_name: value.brandName,
        brand_name: value.brandName,
        generic_name: value.genericName,
        variants: value.variants.map((variant) => ({
            ...variant,
            variant_id: variant.id,
            timings: variant.timings,
            dosage: variant.dosage,
            duration: variant.duration,
            type: variant.type,
            medicine_type: variant.type,
            instructions: variant.instructions,
            purchaseCount: variant.purchaseCount,
            purchase_count: variant.purchaseCount,
        })),
    };
}

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
    const [currentPrescriptionData, setCurrentPrescriptionData] = useState<PrescriptionData | null>(null);
    const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [doctorUser, setDoctorUser] = useState<User | null>(sessionUser);

    const [sectionsOrder, setSectionsOrder] = useState<ListItem[]>(INITIAL_SECTIONS_ORDER);
    const settingsLoadedRef = useRef(false);
    const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
        pencil_thickness: MIN_PENCIL_THICKNESS,
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
                const data = await MasterDataRepository.getItems(category, forceRefresh);
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
                pencil_thickness: normalizePencilThickness(settings.pencil_thickness),
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
        setAdvancedSettings(prev => {
            if (key === 'pencil_thickness') {
                return { ...prev, pencil_thickness: normalizePencilThickness(value) };
            }
            return { ...prev, [key]: value };
        });
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
        if (activeSection === 'Prescriptions') {
            setCurrentPrescriptionData(null);
            setIsModalVisible(false);
            setIsPrescriptionModalVisible(true);
            return;
        }

        setCurrentPrescriptionData(null);
        setIsPrescriptionModalVisible(false);
        setIsModalVisible(true);
    }, [activeSection]);

    const openEditModal = useCallback((item: MasterDataItem) => {
        if (activeSection === 'Prescriptions') {
            setEditingItem(item);
            setCurrentPrescriptionData(mapItemToPrescriptionData(item));
            setIsModalVisible(false);
            setIsPrescriptionModalVisible(true);
        } else {
            setEditingItem(item);
            setCurrentPrescriptionData(null);
            setIsPrescriptionModalVisible(false);
            setIsModalVisible(true);
        }
    }, [activeSection]);

    const closeItemModal = useCallback(() => {
        setIsModalVisible(false);
        setIsPrescriptionModalVisible(false);
        setCurrentPrescriptionData(null);
        setEditingItem(null);
    }, []);

    const handleSaveItem = useCallback(async (value: string | any) => {
        const category = SECTION_MAPPING[activeSection];
        if (!category) return;

        if (!doctorId) return;

        try {
            if (activeSection === 'Prescriptions') {
                if (!isPrescriptionData(value)) {
                    Alert.alert('Error', 'Invalid prescription data');
                    return;
                }

                const payload = toPrescriptionPayload(value);
                if (editingItem) {
                    await MasterDataRepository.updateItem(category, editingItem._id, payload);
                } else {
                    await MasterDataRepository.addItem(category, payload);
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
            setCurrentPrescriptionData(null);
            setEditingItem(null);
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
