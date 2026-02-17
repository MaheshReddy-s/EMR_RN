import { useCallback, useRef, useState } from 'react';
import type { StrokeData, VisitHistory } from '@/entities';
import { ConsultationRepository } from '@/repositories';

export interface ConsultationDetailRow {
    text: string;
    name?: string;
    dosage?: string;
    duration?: string;
    drawings: StrokeData[];
    height?: number;
}

export interface ConsultationDetailSection {
    key: string;
    title: string;
    rows: ConsultationDetailRow[];
}

type SectionConfig = {
    key: string;
    title: string;
    aliases?: string[];
};

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
        const rowHeight = toPositiveNumber(record.height, 60);
        const text =
            primary && note && primary !== note
                ? `${primary} - ${note}`
                : (primary || note || '');

        if (text || drawings.length > 0) {
            rows.push({
                text,
                drawings,
                height: rowHeight,
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
        const prescriptionLevelHeight = toPositiveNumber(record.height, 80);

        const variants = toArray(record.variants);
        if (variants.length === 0) {
            if (medicineName || prescriptionLevelDrawings.length > 0) {
                rows.push({
                    text: medicineName || '',
                    drawings: prescriptionLevelDrawings,
                    height: prescriptionLevelHeight,
                });
            }
            return;
        }

        variants.forEach((variant) => {
            const variantRecord = toRecord(variant);
            if (!variantRecord) {
                if (medicineName || prescriptionLevelDrawings.length > 0) {
                    rows.push({
                        text: medicineName || '',
                        drawings: prescriptionLevelDrawings,
                        height: prescriptionLevelHeight,
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
            const variantDrawings = extractDrawings(variantRecord.drawings);
            const drawings = variantDrawings.length > 0 ? variantDrawings : prescriptionLevelDrawings;
            const rowHeight = toPositiveNumber(variantRecord.height, prescriptionLevelHeight);
            let rowText = '';

            if (medicineName && variantParts.length > 0) {
                rowText = `${medicineName} - ${variantParts.join(' | ')}`;
            } else if (medicineName) {
                rowText = medicineName;
            } else if (variantParts.length > 0) {
                rowText = variantParts.join(' | ');
            }

            if (rowText || drawings.length > 0) {
                // Return structured data so the UI can replicate the layering exactly
                rows.push({
                    text: rowText,
                    name: medicineName || '',
                    dosage: toNonEmptyText(variantRecord.dosage) || '',
                    duration: toNonEmptyText(variantRecord.duration) || '',
                    drawings,
                    height: rowHeight,
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

export function useVisitConsultationDetails() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedVisit, setSelectedVisit] = useState<VisitHistory | null>(null);
    const [sections, setSections] = useState<ConsultationDetailSection[]>([]);
    const requestIdRef = useRef(0);

    const closeVisitDetails = useCallback(() => {
        requestIdRef.current += 1;
        setIsVisible(false);
        setIsLoading(false);
        setErrorMessage(null);
        setSelectedVisit(null);
        setSections([]);
    }, []);

    const openVisitDetails = useCallback(async (visit: VisitHistory) => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        setSelectedVisit(visit);
        setSections([]);
        setErrorMessage(null);
        setIsLoading(true);
        setIsVisible(true);

        if (!visit.consultationID) {
            if (requestIdRef.current === requestId) {
                setErrorMessage('Consultation reference is missing for this visit.');
                setIsLoading(false);
            }
            return;
        }

        try {
            const payload = await ConsultationRepository.getConsultationDetails(visit.consultationID);
            if (requestIdRef.current !== requestId) return;

            const parsedSections = buildConsultationSections(payload);
            setSections(parsedSections);

            if (parsedSections.length === 0) {
                setErrorMessage('No consultation details available for this visit.');
            }
        } catch (error) {
            if (requestIdRef.current !== requestId) return;
            if (__DEV__) console.error('Failed to fetch consultation details:', error);
            setErrorMessage('Could not load consultation details.');
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, []);

    return {
        isVisible,
        isLoading,
        errorMessage,
        selectedVisit,
        sections,
        openVisitDetails,
        closeVisitDetails,
    };
}
