import type { PrescriptionData, PrescriptionVariant } from '@/entities/consultation/types';
import type { MasterDataItem } from '@/repositories';
import type { AdvancedSettings, ListItem } from '@/features/settings/types';

const TIMING_LETTERS = ['M', 'A', 'E', 'N'] as const;

export const SECTION_LABEL_MAP: Record<string, string> = {
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

export const ALL_SECTION_KEYS = Object.keys(SECTION_LABEL_MAP);
export const MIN_PENCIL_THICKNESS = 1;
export const MAX_PENCIL_THICKNESS = 50;

export function normalizePencilThickness(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return MIN_PENCIL_THICKNESS;
    return Math.max(MIN_PENCIL_THICKNESS, Math.min(MAX_PENCIL_THICKNESS, Math.round(parsed)));
}

export function normalizeTimings(rawValue: unknown): string {
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

export function mapItemToPrescriptionData(item: MasterDataItem): PrescriptionData {
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

export function isPrescriptionData(value: unknown): value is PrescriptionData {
    if (typeof value !== 'object' || value === null) return false;
    return typeof (value as PrescriptionData).brandName === 'string' &&
        Array.isArray((value as PrescriptionData).variants);
}

export function toPrescriptionPayload(value: PrescriptionData): Record<string, any> {
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

export function createDefaultAdvancedSettings(): AdvancedSettings {
    return {
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
    };
}

export function mapAdvancedSettings(settings: Record<string, any>): AdvancedSettings {
    const defaults = createDefaultAdvancedSettings();
    return {
        ...defaults,
        pencil_thickness: normalizePencilThickness(settings.pencil_thickness),
        top_space: settings.top_space ?? defaults.top_space,
        bottom_space: settings.bottom_space ?? defaults.bottom_space,
        left_space: settings.left_space ?? defaults.left_space,
        right_space: settings.right_space ?? defaults.right_space,
        followup_window: settings.followup_window ?? defaults.followup_window,
        slot_duration: settings.slot_duration ?? defaults.slot_duration,
        doctor_details_in_consultation: settings.doctor_details_in_consultation ?? defaults.doctor_details_in_consultation,
        patient_details_in_consultation: settings.patient_details_in_consultation ?? defaults.patient_details_in_consultation,
        letterpad_header: settings.letterpad_header ?? defaults.letterpad_header,
        letterpad_footer: settings.letterpad_footer ?? defaults.letterpad_footer,
        complaints: settings.complaints ?? defaults.complaints,
        diagnosis: settings.diagnosis ?? defaults.diagnosis,
        examination: settings.examination ?? defaults.examination,
        investigation: settings.investigation ?? defaults.investigation,
        procedure: settings.procedure ?? defaults.procedure,
        instruction: settings.instruction ?? defaults.instruction,
        notes: settings.notes ?? defaults.notes,
        prescriptions: settings.prescriptions ?? defaults.prescriptions,
        numbers_for_prescriptions: settings.numbers_for_prescriptions ?? defaults.numbers_for_prescriptions,
    };
}

export function buildSectionsOrder(settings: Record<string, any>): ListItem[] {
    const sequence: string[] = Array.isArray(settings.sections_sequence)
        ? settings.sections_sequence
        : ALL_SECTION_KEYS;

    const remaining = new Set<string>(ALL_SECTION_KEYS);
    const ordered: ListItem[] = [];

    for (const key of sequence) {
        if (!remaining.has(key)) continue;
        ordered.push({
            id: `section-${key}`,
            label: SECTION_LABEL_MAP[key] || key,
            key,
            enabled: settings[key] !== false,
        });
        remaining.delete(key);
    }

    for (const key of remaining) {
        ordered.push({
            id: `section-${key}`,
            label: SECTION_LABEL_MAP[key] || key,
            key,
            enabled: settings[key] !== false,
        });
    }

    return ordered;
}

export function buildSettingsPayload(
    advancedSettings: AdvancedSettings,
    sectionsOrder: ListItem[],
    overrides?: Partial<AdvancedSettings>
): Record<string, any> {
    const payload: Record<string, any> = {
        ...advancedSettings,
        ...overrides,
        sections_sequence: sectionsOrder.map((section) => section.key),
    };

    for (const section of sectionsOrder) {
        payload[section.key] = section.enabled;
    }

    return payload;
}
