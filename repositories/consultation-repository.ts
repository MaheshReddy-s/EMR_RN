import { ConsultationSection } from '@/constants/endpoints';
import { ConsultationRecord, SuggestionItem } from '@/entities';
import { ConsultationService } from '@/services/consultation-service';
import type { ConsultationPdfUploadPayload } from '@/services/consultation-service';
import { createCacheMissRateLogger } from '@/shared/lib/cache-observability';
import { normalizeApiError } from '@/shared/lib/error-normalizer';
import { getTenantContext, requireTenantContext } from '@/shared/lib/tenant-context';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONSULTATION_CACHE_SIZE = Number(process.env.EXPO_PUBLIC_CONSULTATION_CACHE_MAX || 300);
const suggestionCache = new Map<string, any[]>();
const suggestionTimestamps = new Map<string, number>();
const inFlightSuggestionRequests = new Map<string, Promise<any[]>>();
const cacheMissLogger = createCacheMissRateLogger('ConsultationRepository:suggestions');
let suggestionVersion = 0;
let prescriptionVersion = 0;

function assertTenantContext(methodName: string): void {
    if (__DEV__ && !getTenantContext()) {
        console.warn(`[ConsultationRepository] ${methodName} called without tenant context.`);
    }
}

function getMaxConsultationCacheSize(): number {
    if (Number.isFinite(MAX_CONSULTATION_CACHE_SIZE) && MAX_CONSULTATION_CACHE_SIZE > 0) {
        return MAX_CONSULTATION_CACHE_SIZE;
    }
    return 300;
}

function setCacheEntry(cacheKey: string, payload: any[]): void {
    if (suggestionCache.has(cacheKey)) {
        suggestionCache.delete(cacheKey);
    }
    suggestionCache.set(cacheKey, payload);
    suggestionTimestamps.set(cacheKey, Date.now());

    const maxSize = getMaxConsultationCacheSize();
    while (suggestionCache.size > maxSize) {
        const evictedKey = suggestionCache.keys().next().value as string | undefined;
        if (!evictedKey) break;
        suggestionCache.delete(evictedKey);
        suggestionTimestamps.delete(evictedKey);
        inFlightSuggestionRequests.delete(evictedKey);
        if (__DEV__) {
            console.warn(
                `[ConsultationRepository] FIFO eviction: removed cache entry "${evictedKey}" (max=${maxSize}).`
            );
        }
    }
}

function isFresh(key: string): boolean {
    const cachedAt = suggestionTimestamps.get(key) || 0;
    return Date.now() - cachedAt <= CACHE_TTL_MS;
}

function getSuggestionCacheKey(clinicId: string, doctorId: string, section: ConsultationSection): string {
    return `suggestion:${clinicId}:${doctorId}:${section}`;
}

function getPrescriptionCacheKey(clinicId: string, doctorId: string): string {
    return `prescription:${clinicId}:${doctorId}`;
}

function invalidatePrescriptionCache(clinicId: string, doctorId: string): void {
    prescriptionVersion++;
    const key = getPrescriptionCacheKey(clinicId, doctorId);
    suggestionCache.delete(key);
    suggestionTimestamps.delete(key);
    inFlightSuggestionRequests.delete(key);
}

export const ConsultationRepository = {
    /**
     * Submit a consultation record.
     */
    async submitConsultation(record: ConsultationRecord): Promise<any> {
        assertTenantContext('submitConsultation');
        try {
            const { doctorId } = requireTenantContext();
            const normalizedRecord: ConsultationRecord = {
                ...record,
                doctor_id: doctorId,
            };
            const result = await ConsultationService.submitConsultation(normalizedRecord);
            // Suggestion sources can change after completed consultation.
            ConsultationRepository.invalidate();
            return result;
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    /**
     * Upload consultation PDF to consultation-history endpoint.
     */
    async uploadConsultationPdf(payload: Omit<ConsultationPdfUploadPayload, 'doctorId'>): Promise<Record<string, unknown>> {
        assertTenantContext('uploadConsultationPdf');
        try {
            const { doctorId } = requireTenantContext();
            return await ConsultationService.uploadConsultationPdf({
                ...payload,
                doctorId,
            });
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    /**
     * Fetch suggestion items with deduped in-flight requests + TTL cache.
     */
    async getSuggestions(
        section: ConsultationSection,
        forceRefresh = false
    ): Promise<SuggestionItem[]> {
        assertTenantContext('getSuggestions');
        const { clinicId, doctorId } = requireTenantContext();
        const key = getSuggestionCacheKey(clinicId, doctorId, section);

        if (!forceRefresh && suggestionCache.has(key) && isFresh(key)) {
            cacheMissLogger.recordHit();
            return suggestionCache.get(key)! as SuggestionItem[];
        }
        cacheMissLogger.recordMiss();

        const existing = inFlightSuggestionRequests.get(key);
        if (existing) return existing;

        const currentVersion = suggestionVersion;

        const request = (async () => {
            try {
                const suggestions = await ConsultationService.getSuggestions(doctorId, section);
                if (currentVersion === suggestionVersion) {
                    setCacheEntry(key, suggestions);
                }
                return suggestions as any[];
            } catch (error) {
                throw normalizeApiError(error);
            } finally {
                inFlightSuggestionRequests.delete(key);
            }
        })();

        inFlightSuggestionRequests.set(key, request);
        return request as Promise<SuggestionItem[]>;
    },

    /**
     * Fetch a single consultation record by ID.
     */
    async getConsultationDetails(consultationId: string): Promise<Record<string, unknown>> {
        assertTenantContext('getConsultationDetails');
        try {
            requireTenantContext();
            return await ConsultationService.getConsultationDetails(consultationId);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    /**
     * Fetch prescription suggestions with the same cache/dedupe strategy.
     */
    async getPrescriptions(forceRefresh = false): Promise<any[]> {
        assertTenantContext('getPrescriptions');
        const { clinicId, doctorId } = requireTenantContext();
        const key = getPrescriptionCacheKey(clinicId, doctorId);

        if (!forceRefresh && suggestionCache.has(key) && isFresh(key)) {
            cacheMissLogger.recordHit();
            return suggestionCache.get(key)!;
        }
        cacheMissLogger.recordMiss();

        const existing = inFlightSuggestionRequests.get(key);
        if (existing) return existing;

        const currentVersion = prescriptionVersion;

        const request = (async () => {
            try {
                const prescriptions = await ConsultationService.getPrescriptions(doctorId);
                if (currentVersion === prescriptionVersion) {
                    setCacheEntry(key, prescriptions);
                }
                return prescriptions;
            } catch (error) {
                throw normalizeApiError(error);
            } finally {
                inFlightSuggestionRequests.delete(key);
            }
        })();

        inFlightSuggestionRequests.set(key, request);
        return request;
    },

    /**
     * Create a new prescription or variant and invalidate cache.
     */
    async createPrescription(payload: Record<string, any>): Promise<any[]> {
        assertTenantContext('createPrescription');
        const { clinicId, doctorId } = requireTenantContext();
        await ConsultationService.createPrescription(doctorId, payload);
        invalidatePrescriptionCache(clinicId, doctorId);
        return ConsultationRepository.getPrescriptions();
    },

    /**
     * Get specific prescription details.
     */
    async getPrescriptionDetails(prescriptionId: string, variantId?: string): Promise<any> {
        assertTenantContext('getPrescriptionDetails');
        const { doctorId } = requireTenantContext();
        return ConsultationService.getPrescriptionDetails(doctorId, prescriptionId, variantId);
    },

    /**
     * Update prescription and invalidate cache.
     */
    async updatePrescription(prescriptionId: string, payload: Record<string, any>): Promise<any[]> {
        assertTenantContext('updatePrescription');
        const { clinicId, doctorId } = requireTenantContext();
        await ConsultationService.updatePrescription(doctorId, prescriptionId, payload);
        invalidatePrescriptionCache(clinicId, doctorId);
        return ConsultationRepository.getPrescriptions();
    },

    /**
     * Delete prescription and invalidate cache.
     */
    async deletePrescription(prescriptionId: string, variantId?: string): Promise<boolean> {
        assertTenantContext('deletePrescription');
        const { clinicId, doctorId } = requireTenantContext();
        const result = await ConsultationService.deletePrescription(doctorId, prescriptionId, variantId);
        invalidatePrescriptionCache(clinicId, doctorId);
        return result;
    },

    invalidate(section?: ConsultationSection): void {
        assertTenantContext('invalidate');
        const tenant = requireTenantContext();
        const doctorId = tenant.doctorId;
        const clinicId = tenant.clinicId;
        if (section) {
            suggestionVersion++;
            const key = getSuggestionCacheKey(clinicId, doctorId, section);
            suggestionCache.delete(key);
            suggestionTimestamps.delete(key);
            inFlightSuggestionRequests.delete(key);
            return;
        }

        suggestionVersion++;
        prescriptionVersion++;

        const keyPrefix = `suggestion:${clinicId}:${doctorId}:`;
        const prescriptionKey = getPrescriptionCacheKey(clinicId, doctorId);
        for (const key of suggestionCache.keys()) {
            if (key.startsWith(keyPrefix) || key === prescriptionKey) {
                suggestionCache.delete(key);
                suggestionTimestamps.delete(key);
                inFlightSuggestionRequests.delete(key);
            }
        }
    },

    clearCache(): void {
        assertTenantContext('clearCache');
        ConsultationRepository.invalidate();
    },
};
