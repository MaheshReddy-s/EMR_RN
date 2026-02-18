/**
 * Shared utility to normalize API consultation data into structured format.
 * Used by visit details modal and consultation pre-filling logic.
 */

import type { ConsultationState, StrokeData, TabType } from '@/entities/consultation/types';
import { SECTION_KEYS } from '@/hooks/useConsultation';

export interface ConsultationDetailRow {
    text: string;
    name?: string;
    genericName?: string;
    dosage?: string;
    duration?: string;
    instructions?: string;
    timings?: string;
    notes?: string;
    drawings: StrokeData[];
    height?: number;
    id?: string;
}

export interface ConsultationDetailSection {
    key: string;
    title: string;
    rows: ConsultationDetailRow[];
}

export function mapToConsultationState(payload: Record<string, unknown>): Partial<ConsultationState> {
    const sections = buildConsultationSections(payload);
    const state: any = {};

    sections.forEach((section) => {
        // Only map sections that exist in ConsultationState
        if (SECTION_KEYS.includes(section.key as TabType)) {
            state[section.key] = section.rows.map((row) => ({
                id: row.id || Date.now().toString() + Math.random(),
                name: row.name || row.text,
                genericName: row.genericName,
                dosage: row.dosage,
                duration: row.duration,
                instructions: row.instructions,
                timings: row.timings,
                drawings: row.drawings,
                height: row.height,
                notes: row.notes,
            }));
        }
    });

    return state;
}

interface SectionConfig {
    key: string;
    title: string;
    aliases?: string[];
}

const SECTION_CONFIG: SectionConfig[] = [
    { key: 'complaints', title: 'Complaints', aliases: ['chief_complaints'] },
    { key: 'diagnosis', title: 'Diagnosis' },
    { key: 'examination', title: 'Examination' },
    { key: 'investigation', title: 'Investigation' },
    { key: 'procedure', title: 'Procedure' },
    { key: 'prescriptions', title: 'Prescriptions' },
    { key: 'instruction', title: 'Instruction', aliases: ['instructions'] },
    { key: 'notes', title: 'Notes' },
];

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function toArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function toNonEmptyText(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return null;
}

function toPositiveNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return fallback;
}

function calculateMaxY(drawings: StrokeData[]): number {
    let maxY = 0;
    drawings.forEach((s) => {
        // Extract all numeric values from the SVG path string
        const numbers = s.svg.match(/-?\d+\.?\d*/g);
        if (numbers) {
            // Coordinates in SVG paths are almost always in (X, Y) pairs.
            // Y is at the odd indices (1, 3, 5...)
            for (let i = 1; i < numbers.length; i += 2) {
                const y = parseFloat(numbers[i]);
                if (Number.isFinite(y) && y > maxY) maxY = y;
            }
        }
    });

    if (maxY === 0 && drawings.length > 0) return 40;

    // Convert logical Y (0-820) to container height (relative to 720px width)
    // Formula: physicalHeight = logicalHeight * (720 / 820)
    // Add a small buffer (6px) to prevent baseline clipping
    const calculatedHeight = Math.ceil((maxY * 720) / 820) + 6;

    // Ensure a reasonable minimum height if we have drawings
    return drawings.length > 0 ? Math.max(40, calculatedHeight) : 0;
}

function extractDrawings(value: unknown): StrokeData[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((stroke) => {
            const record = toRecord(stroke);
            if (!record) return null;

            const svg = toNonEmptyText(record.svg);
            if (!svg) return null;

            return {
                svg,
                color: toNonEmptyText(record.color) || '#5d271aff',
                width: toPositiveNumber(record.width, 1.5),
                blendMode: record.blendMode,
            } as StrokeData;
        })
        .filter((stroke): stroke is StrokeData => Boolean(stroke));
}

function formatDateValue(value: unknown): string | null {
    if (value == null) return null;

    let date: Date | null = null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const millis = value > 1_000_000_000_000 ? value : value * 1000;
        date = new Date(millis);
    } else if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && value.trim() !== '') {
            const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
            date = new Date(millis);
        } else {
            date = new Date(value);
        }
    }

    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function extractGenericRows(items: unknown[]): ConsultationDetailRow[] {
    const rows: ConsultationDetailRow[] = [];

    items.forEach((item) => {
        if (typeof item === 'string') {
            const text = toNonEmptyText(item);
            if (text) {
                rows.push({
                    text,
                    drawings: [],
                    height: 60,
                    id: Date.now().toString() + Math.random(),
                    name: text,
                });
            }
            return;
        }

        const record = toRecord(item);
        if (!record) return;

        const primary =
            toNonEmptyText(record.name) ||
            toNonEmptyText(record.property_value) ||
            toNonEmptyText(record.label) ||
            toNonEmptyText(record.title) ||
            toNonEmptyText(record.value) ||
            toNonEmptyText(record.text);

        const note = toNonEmptyText(record.notes);
        const drawings = extractDrawings(record.drawings);
        const drawingHeight = calculateMaxY(drawings);
        const apiHeight = toPositiveNumber(record.height, 0);
        const rowHeight = Math.max(apiHeight, drawingHeight);
        const id = toNonEmptyText(record.id) || Date.now().toString() + Math.random();

        const text = primary || note || '';

        if (text || drawings.length > 0) {
            rows.push({
                text,
                name: primary || '',
                notes: note || '',
                drawings,
                height: rowHeight,
                id,
            });
        }
    });

    return rows;
}

function extractPrescriptionRows(items: unknown[]): ConsultationDetailRow[] {
    const rows: ConsultationDetailRow[] = [];

    items.forEach((item) => {
        const record = toRecord(item);
        if (!record) return;

        const medicineName =
            toNonEmptyText(record.brand_name) ||
            toNonEmptyText(record.name) ||
            toNonEmptyText(record.generic_name);
        const prescriptionLevelDrawings = extractDrawings(record.drawings);
        const prescriptionLevelDrawingHeight = calculateMaxY(prescriptionLevelDrawings);
        const prescriptionLevelApiHeight = toPositiveNumber(record.height, 0);

        const variants = toArray(record.variants);
        const id = toNonEmptyText(record.id) || Date.now().toString() + Math.random();

        if (variants.length === 0) {
            if (medicineName || prescriptionLevelDrawings.length > 0) {
                rows.push({
                    text: medicineName || '',
                    name: medicineName || '',
                    genericName: toNonEmptyText(record.generic_name) || undefined,
                    drawings: prescriptionLevelDrawings,
                    height: Math.max(prescriptionLevelApiHeight, prescriptionLevelDrawingHeight),
                    id,
                });
            }
            return;
        }

        variants.forEach((variant) => {
            const variantRecord = toRecord(variant);
            let combinedDrawings = prescriptionLevelDrawings;
            let combinedHeight = Math.max(prescriptionLevelApiHeight, prescriptionLevelDrawingHeight);

            if (variantRecord) {
                const variantDrawings = extractDrawings(variantRecord.drawings);
                if (variantDrawings.length > 0) {
                    combinedDrawings = variantDrawings;
                    const vDrawingHeight = calculateMaxY(variantDrawings);
                    const vApiHeight = toPositiveNumber(variantRecord.height, 0);
                    combinedHeight = Math.max(vApiHeight, vDrawingHeight);
                } else {
                    const vApiHeight = toPositiveNumber(variantRecord.height, 0);
                    if (vApiHeight > 0) {
                        combinedHeight = Math.max(vApiHeight, combinedHeight);
                    }
                }
            }

            if (!variantRecord) {
                if (medicineName || combinedDrawings.length > 0) {
                    rows.push({
                        text: medicineName || '',
                        name: medicineName || '',
                        genericName: toNonEmptyText(record.generic_name) || undefined,
                        drawings: combinedDrawings,
                        height: combinedHeight,
                        id,
                    });
                }
                return;
            }

            const variantParts = [
                toNonEmptyText(variantRecord.timings),
                toNonEmptyText(variantRecord.dosage),
                toNonEmptyText(variantRecord.duration),
                toNonEmptyText(variantRecord.instructions),
            ].filter((part): part is string => Boolean(part));

            let rowText = '';
            if (medicineName && variantParts.length > 0) {
                rowText = `${medicineName} - ${variantParts.join(' | ')}`;
            } else if (medicineName) {
                rowText = medicineName;
            } else if (variantParts.length > 0) {
                rowText = variantParts.join(' | ');
            }

            if (rowText || combinedDrawings.length > 0) {
                rows.push({
                    text: rowText,
                    name: medicineName || '',
                    genericName: toNonEmptyText(record.generic_name) || undefined,
                    timings: toNonEmptyText(variantRecord.timings) || '',
                    dosage: toNonEmptyText(variantRecord.dosage) || '',
                    instructions: toNonEmptyText(variantRecord.instructions) || '',
                    duration: toNonEmptyText(variantRecord.duration) || '',
                    drawings: combinedDrawings,
                    height: combinedHeight || 26, // Fallback for prescriptions
                    id,
                });
            }
        });
    });

    return rows;
}

function unwrapPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const nested = toRecord(payload.data);
    return nested || payload;
}

function getSectionItems(
    source: Record<string, unknown>,
    section: SectionConfig
): unknown[] {
    const keys = [section.key, ...(section.aliases || [])];
    for (const key of keys) {
        const values = toArray(source[key]);
        if (values.length > 0) return values;
    }
    return [];
}

export function buildConsultationSections(payload: Record<string, unknown>): ConsultationDetailSection[] {
    const source = unwrapPayload(payload);
    const sections: ConsultationDetailSection[] = [];

    SECTION_CONFIG.forEach((section) => {
        const items = getSectionItems(source, section);
        if (items.length === 0) return;

        const rows = section.key === 'prescriptions'
            ? extractPrescriptionRows(items)
            : extractGenericRows(items);

        if (rows.length > 0) {
            sections.push({
                key: section.key,
                title: section.title,
                rows,
            });
        }
    });

    const followUpValue = source.follow_up_date ?? source.followup_date;
    const followUpDate = formatDateValue(followUpValue);
    if (followUpDate) {
        sections.push({
            key: 'follow_up_date',
            title: 'Follow Up',
            rows: [{
                text: followUpDate,
                drawings: [],
            }],
        });
    }

    return sections;
}
