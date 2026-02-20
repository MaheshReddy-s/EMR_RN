import { VisitHistory } from '@/entities';

type RawRecord = Record<string, unknown>;

export function extractConsultations(historyData: unknown): RawRecord[] {
    if (Array.isArray(historyData)) {
        return historyData as RawRecord[];
    }
    const data = (historyData as RawRecord | undefined)?.data;
    return Array.isArray(data) ? (data as RawRecord[]) : [];
}

export function extractPdfHistory(
    historyData: unknown,
    latestConsultation?: RawRecord
): RawRecord[] {
    const topLevelPdfHistory = (historyData as RawRecord | undefined)?.pdf_history;
    if (Array.isArray(topLevelPdfHistory)) return topLevelPdfHistory as RawRecord[];

    const consultationPdfHistory = latestConsultation?.pdf_history;
    if (Array.isArray(consultationPdfHistory)) return consultationPdfHistory as RawRecord[];

    return [];
}

export function mergeVisitHistory(
    consultationHistory: VisitHistory[],
    pdfHistory: VisitHistory[]
): VisitHistory[] {
    const combinedMap = new Map<string, VisitHistory>();

    pdfHistory.forEach((item) => {
        const key = item.link || item.id;
        combinedMap.set(key, item);
    });

    consultationHistory.forEach((item) => {
        const key = item.consultationID || item.id;
        const existing = combinedMap.get(key);
        if (existing) {
            combinedMap.set(key, { ...item, link: existing.link || item.link });
            return;
        }
        combinedMap.set(key, item);
    });

    return Array.from(combinedMap.values()).sort((a, b) => {
        const valA = a.consultationID || a.id;
        const valB = b.consultationID || b.id;
        return valB.localeCompare(valA);
    });
}

export function buildRawPayloadMap(consultations: RawRecord[]): Map<string, RawRecord> {
    const payloadMap = new Map<string, RawRecord>();
    consultations.forEach((consultation) => {
        const id = consultation._id || consultation.consultation_id || consultation.id;
        if (!id) return;
        payloadMap.set(String(id), consultation);
    });
    return payloadMap;
}
