import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';
import type { ConsultationSection } from '@/constants/endpoints';
import type { ConsultationItem } from '@/entities';
import type { SuggestionItem } from '@/entities';
import type { TabType, ConsultationState } from '@/hooks/useConsultation';
import { useTenant } from '@/hooks/useTenant';
import { ConsultationRepository } from '@/repositories';
import type { PrescriptionData } from '@/components/consultation/prescription-modal';

export interface ConsultationSuggestion {
    id: string;
    label: string;
    frequency?: number;
    data?: any;
    drawings?: any;
}

interface UseConsultationSuggestionsParams {
    activeTab: TabType;
    writingText: string;
    consultation: ConsultationState;
    addItem: (section: TabType, item: ConsultationItem) => void;
    onOpenPrescription: (data: PrescriptionData) => void;
}

export function useConsultationSuggestions({
    activeTab,
    writingText,
    consultation,
    addItem,
    onOpenPrescription,
}: UseConsultationSuggestionsParams) {
    const { doctorId } = useTenant();
    const [cachedSuggestions, setCachedSuggestions] = useState<Record<string, ConsultationSuggestion[]>>({});
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const fetchSuggestionsForActiveTab = useCallback(async (forceRefresh = false) => {
        if (!doctorId || !activeTab) return;
        if (!forceRefresh && cachedSuggestions[activeTab]) return;

        setIsLoadingSuggestions(true);
        try {
            let fetchedItems: SuggestionItem[] = [];
            if (activeTab === 'prescriptions') {
                const rxList = await ConsultationRepository.getPrescriptions(forceRefresh);
                fetchedItems = rxList.map((item) => ({
                    id: item._id || item.id,
                    label: item.brand_name || item.name || '',
                    frequency: item.usage_frequency || item.frequency || 0,
                    data: item,
                }));
            } else {
                fetchedItems = await ConsultationRepository.getSuggestions(
                    activeTab as ConsultationSection,
                    forceRefresh
                );
            }

            const mappedSuggestions: ConsultationSuggestion[] = fetchedItems.map((item) => ({
                id: item.id,
                label: item.label,
                frequency: item.frequency,
                data: (item as any).data,
            }));

            setCachedSuggestions((prev) => ({ ...prev, [activeTab]: mappedSuggestions }));
        } catch (error) {
            if (__DEV__) console.error(`Error fetching suggestions for ${activeTab}:`, error);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [activeTab, cachedSuggestions, doctorId]);

    useEffect(() => {
        void fetchSuggestionsForActiveTab(false);
    }, [fetchSuggestionsForActiveTab]);

    const suggestions = useMemo((): ConsultationSuggestion[] => {
        const allSuggestions = cachedSuggestions[activeTab] || [];
        const currentItems: ConsultationItem[] = (consultation[activeTab] as ConsultationItem[]) || [];

        const selectedNames = new Set(currentItems.map((i) => i.name.toLowerCase()));
        let filtered = allSuggestions.filter((s) => !selectedNames.has(s.label.toLowerCase()));

        if (writingText.trim()) {
            const query = writingText.toLowerCase().trim();
            filtered = filtered
                .filter((s) => s.label.toLowerCase().includes(query))
                .sort((a, b) => {
                    const aStarts = a.label.toLowerCase().startsWith(query);
                    const bStarts = b.label.toLowerCase().startsWith(query);

                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return 0;
                });
        }

        return filtered.slice(0, 50);
    }, [activeTab, cachedSuggestions, consultation, writingText]);

    const onSuggestionSelect = useCallback((suggestion: ConsultationSuggestion) => {
        Keyboard.dismiss();

        const id = Date.now().toString();
        const item: ConsultationItem = {
            id,
            name: suggestion.label,
            drawings: (suggestion as any).drawings,
        };

        if (activeTab === 'prescriptions') {
            const rxData = suggestion.data || {};
            onOpenPrescription({
                brandName: rxData.brand_name || suggestion.label,
                genericName: rxData.generic_name || '',
                variants: Array.isArray(rxData.variants) ? rxData.variants.map((v: any, idxVar: number) => {
                    const rawTimings = (v.frequency || v.time || v.timings || '').toUpperCase().split('-');
                    // Ensure we have exactly 4 slots (M-A-E-N)
                    while (rawTimings.length < 4) {
                        rawTimings.push('');
                    }
                    const timings = rawTimings.slice(0, 4).map((p: string, idxValue: number) => {
                        const val = p.trim();
                        const isActive = val !== '0' && val !== 'O' && val !== '' && val !== '-';
                        if (!isActive) return '-';
                        if (idxValue === 0) return 'M';
                        if (idxValue === 1) return 'A';
                        if (idxValue === 2) return 'E';
                        if (idxValue === 3) return 'N';
                        return val;
                    }).join('-');

                    const rawDuration = v.duration || '';
                    const durationText = rawDuration && /^\d+$/.test(rawDuration.toString()) ? `${rawDuration} Days` : rawDuration;

                    return {
                        id: v.variant_id || v._id || `${Date.now()}-${idxVar}`,
                        timings: timings,
                        dosage: v.quantity ? `${v.quantity}${v.units && v.units !== 'N/A' ? ` ${v.units}` : ''}` : (v.dosage || ''),
                        duration: durationText,
                        type: v.medicine_type || v.type || '',
                    };
                }) : [],
            });
            return;
        }

        addItem(activeTab, item);
    }, [activeTab, addItem, onOpenPrescription]);

    const refreshSuggestions = useCallback(async () => {
        await fetchSuggestionsForActiveTab(true);
    }, [fetchSuggestionsForActiveTab]);

    return {
        suggestions,
        isLoadingSuggestions,
        onSuggestionSelect,
        refreshSuggestions,
    };
}
