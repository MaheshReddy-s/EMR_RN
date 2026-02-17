/**
 * Format Utilities — Shared formatting helpers
 * ──────────────────────────────────────────────
 * Extracted from:
 *   - app/(app)/patient/[id].tsx (safeFormatTimestamp, stableVisitId)
 *   - components/patient/VisitHistoryModal.tsx (safeFormatTimestamp)
 *
 * ZERO BEHAVIOR CHANGE: Same logic, same fallbacks.
 */

/**
 * Safely parse a Unix timestamp (seconds) to a formatted date string.
 * Returns 'Unknown Date' if the value is missing, not a number, or results in an invalid Date.
 */
/**
 * Safely extract a date value from various possible fields in a consultation or PDF history item.
 */
function extractBestDate(item: Record<string, unknown>): unknown {
    // 1. Check root level fields
    const rootDate =
        item.created_at ||
        item.submittedAt ||
        item.apt_date ||
        item.created_timestamp ||
        item.created_at_timestamp ||
        item.date;

    if (rootDate != null) return rootDate;

    // 2. Check nested in 'data' field
    const nestedData = item.data as Record<string, unknown> | undefined;
    if (nestedData && typeof nestedData === 'object') {
        const nestedDate =
            nestedData.created_at ||
            nestedData.submittedAt ||
            nestedData.apt_date ||
            nestedData.created_timestamp ||
            nestedData.date;
        if (nestedDate != null) return nestedDate;
    }

    // 3. Check if it's nested in pdf_history
    const pdfHistory = item.pdf_history as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(pdfHistory) && pdfHistory.length > 0) {
        const firstPdf = pdfHistory[0];
        return firstPdf.created_timestamp || firstPdf.created_at || firstPdf.date;
    }

    return null;
}

/**
 * Safely parse a Unix timestamp (seconds) or absolute date string to a formatted date string.
 * Returns 'Unknown Date' if the value is missing or invalid.
 */
export function safeFormatTimestamp(rawTimestamp: unknown): string {
    if (rawTimestamp == null) return 'Unknown Date';

    let date: Date;

    if (rawTimestamp instanceof Date) {
        date = rawTimestamp;
    } else if (typeof rawTimestamp === 'number') {
        // Threshold: 1e12 is ~Sep 2001. If lower, assume seconds; else milliseconds.
        const millis = rawTimestamp > 1_000_000_000_000 ? rawTimestamp : rawTimestamp * 1000;
        date = new Date(millis);
    } else if (typeof rawTimestamp === 'string') {
        const trimmed = rawTimestamp.trim();
        if (!trimmed) return 'Unknown Date';

        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            const millis = parsed > 1_000_000_000_000 ? parsed : parsed * 1000;
            date = new Date(millis);
        } else {
            date = new Date(trimmed);
        }
    } else if (typeof rawTimestamp === 'object' && rawTimestamp !== null) {
        if ('getTime' in (rawTimestamp as any)) {
            date = rawTimestamp as Date;
        } else if ('$date' in (rawTimestamp as any)) {
            const val = (rawTimestamp as any).$date;
            const millis = typeof val === 'number' && val < 1_000_000_000_000 ? val * 1000 : Number(val);
            date = new Date(millis);
        } else {
            return 'Unknown Date';
        }
    } else {
        return 'Unknown Date';
    }

    if (Number.isNaN(date.getTime())) return 'Unknown Date';

    return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Generate a stable, unique ID for a visit history entry.
 */
export function stableVisitId(h: Record<string, unknown>, index: number): string {
    return (h.consultation_id as string) || (h._id as string) || (h.id as string) || (h.pdf_link as string) || `visit-${index}`;
}

function toUnixTimestamp(value: unknown): number {
    if (value == null) return 0;

    if (value instanceof Date) {
        return value.getTime() / 1000;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 1_000_000_000_000 ? value / 1000 : value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;

        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            return parsed > 1_000_000_000_000 ? parsed / 1000 : parsed;
        }

        const dateParsed = Date.parse(trimmed);
        if (Number.isFinite(dateParsed)) return dateParsed / 1000;
    }

    return 0;
}

/**
 * Map raw PDF history records from the API into typed VisitHistory entries.
 */
export function mapPdfHistory(pdfHistory: Array<Record<string, unknown>>): Array<{
    id: string;
    link: string;
    name: string;
    date: string;
    consultationID: string;
}> {
    const sorted = [...pdfHistory].sort(
        (a, b) => toUnixTimestamp(extractBestDate(b)) - toUnixTimestamp(extractBestDate(a))
    );

    return sorted.map((h, idx) => ({
        id: stableVisitId(h, idx),
        link: (h.pdf_link as string) || '',
        name: (h.pdf_name as string) || 'Report',
        date: safeFormatTimestamp(extractBestDate(h)),
        consultationID: (h.consultation_id as string) || (h._id as string) || (h.id as string) || '',
    }));
}

/**
 * Map raw consultation records into typed VisitHistory entries.
 */
export function mapConsultationHistory(consultations: Array<Record<string, unknown>>): Array<{
    id: string;
    link: string;
    name: string;
    date: string;
    consultationID: string;
}> {
    const sorted = [...consultations].sort((a, b) => {
        const dateA = toUnixTimestamp(extractBestDate(a));
        const dateB = toUnixTimestamp(extractBestDate(b));
        return dateB - dateA;
    });

    return sorted.map((c, idx) => ({
        id: stableVisitId(c, idx),
        link: '',
        name: (c.name as string) || 'Consultation',
        date: safeFormatTimestamp(extractBestDate(c)),
        consultationID: (c._id as string) || (c.consultation_id as string) || (c.id as string) || '',
    }));
}
