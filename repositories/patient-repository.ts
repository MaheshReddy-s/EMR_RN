import { Patient, RegisterPatientPayload } from '@/entities';
import { PatientService } from '@/services/patient-service';
import { createCacheMissRateLogger } from '@/shared/lib/cache-observability';
import { normalizeApiError } from '@/shared/lib/error-normalizer';
import { getTenantContext, requireTenantContext } from '@/shared/lib/tenant-context';

/**
 * Patient Repository
 * ──────────────────
 * Manages patient data recovery and caching.
 * 
 * This layer sits between the UI/Services and the API, providing:
 * - In-memory caching for frequently accessed patient profiles.
 * - Future: Persistent caching (offline support).
 * - Future: Optimistic updates.
 */

// Simple in-memory cache for patient details
const patientCache = new Map<string, Patient>();
// Cache TTL (Time To Live) - 10 minutes
const CACHE_TTL = 10 * 60 * 1000;
const MAX_PATIENT_CACHE_SIZE = Number(process.env.EXPO_PUBLIC_PATIENT_CACHE_MAX || 2_500);
const DEV_PATIENT_CACHE_WARN_THRESHOLD = Number(process.env.EXPO_PUBLIC_PATIENT_CACHE_WARN || 2_000);
const SEARCH_DEBOUNCE_MS = Number(process.env.EXPO_PUBLIC_SEARCH_DEBOUNCE_MS || 300);
const DEV_LARGE_SEARCH_WARN_THRESHOLD = Number(process.env.EXPO_PUBLIC_SEARCH_RESULT_WARN || 1_500);
const cacheTimestamps = new Map<string, number>();
// Track in-flight fetches by patient ID to deduplicate concurrent calls
const inFlightRequests = new Map<string, Promise<Patient>>();
const inFlightSearchRequests = new Map<string, Promise<Patient[]>>();
const cacheVersions = new Map<string, number>();
const searchDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingSearchWaiters = new Map<
    string,
    Array<{ resolve: (items: Patient[]) => void; reject: (reason: unknown) => void }>
>();
const cacheMissLogger = createCacheMissRateLogger('PatientRepository:getPatientDetails');
let hasWarnedCacheSize = false;

function assertTenantContext(methodName: string): void {
    if (__DEV__ && !getTenantContext()) {
        console.warn(`[PatientRepository] ${methodName} called without tenant context.`);
    }
}

function getMaxPatientCacheSize(): number {
    if (Number.isFinite(MAX_PATIENT_CACHE_SIZE) && MAX_PATIENT_CACHE_SIZE > 0) {
        return MAX_PATIENT_CACHE_SIZE;
    }
    return 2_500;
}

function getSearchDebounceMs(override?: number): number {
    if (typeof override === 'number' && override >= 0) return override;
    if (Number.isFinite(SEARCH_DEBOUNCE_MS) && SEARCH_DEBOUNCE_MS >= 0) return SEARCH_DEBOUNCE_MS;
    return 300;
}

function buildScopedPatientKey(clinicId: string, doctorId: string, patientId: string): string {
    return `${clinicId}:${doctorId}:${patientId}`;
}

function buildScopedSearchKey(clinicId: string, doctorId: string, query: string): string {
    return `${clinicId}:${doctorId}:${query.trim().toLowerCase()}`;
}

function getCacheVersion(patientKey: string): number {
    return cacheVersions.get(patientKey) || 0;
}

function bumpCacheVersion(patientKey: string): void {
    cacheVersions.set(patientKey, getCacheVersion(patientKey) + 1);
}

function promoteCacheEntry(patientKey: string): void {
    const cached = patientCache.get(patientKey);
    if (!cached) return;
    patientCache.delete(patientKey);
    patientCache.set(patientKey, cached);
}

function setCacheEntry(patientKey: string, patient: Patient): void {
    if (patientCache.has(patientKey)) {
        patientCache.delete(patientKey);
    }
    patientCache.set(patientKey, patient);
    cacheTimestamps.set(patientKey, Date.now());

    const maxSize = getMaxPatientCacheSize();
    while (patientCache.size > maxSize) {
        const oldestKey = patientCache.keys().next().value as string | undefined;
        if (!oldestKey) break;

        patientCache.delete(oldestKey);
        cacheTimestamps.delete(oldestKey);
        cacheVersions.delete(oldestKey);
        inFlightRequests.delete(oldestKey);
    }

    if (
        __DEV__ &&
        !hasWarnedCacheSize &&
        Number.isFinite(DEV_PATIENT_CACHE_WARN_THRESHOLD) &&
        patientCache.size >= DEV_PATIENT_CACHE_WARN_THRESHOLD
    ) {
        hasWarnedCacheSize = true;
        console.warn(
            `[PatientRepository] Cache size is high (${patientCache.size}). ` +
            `Consider lowering TTL or tightening pagination usage.`
        );
    }
}

export const PatientRepository = {
    async getPatients(after?: string): Promise<{ patients: Patient[]; after: string }> {
        assertTenantContext('getPatients');
        const { doctorId } = requireTenantContext();
        try {
            return await PatientService.getPatients(doctorId, after);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async registerPatient(payload: RegisterPatientPayload): Promise<Patient> {
        assertTenantContext('registerPatient');
        const { doctorId } = requireTenantContext();
        try {
            return await PatientService.registerPatient(doctorId, payload);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async getPatientHistory(patientId: string): Promise<any> {
        assertTenantContext('getPatientHistory');
        const { doctorId } = requireTenantContext();
        try {
            return await PatientService.getPatientHistory(doctorId, patientId);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async getRecentConsultation(patientId: string): Promise<any> {
        assertTenantContext('getRecentConsultation');
        const { doctorId } = requireTenantContext();
        try {
            return await PatientService.getRecentConsultation(doctorId, patientId);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async getPatientDocuments(patientId: string): Promise<any> {
        assertTenantContext('getPatientDocuments');
        const { clinicId } = requireTenantContext();
        try {
            return await PatientService.getPatientDocuments(clinicId, patientId);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    /**
     * Get patient details by ID.
     * Uses cache if available and not stale.
     */
    async getPatientDetails(patientId: string, forceRefresh = false): Promise<Patient> {
        assertTenantContext('getPatientDetails');
        const { clinicId, doctorId } = requireTenantContext();
        const patientKey = buildScopedPatientKey(clinicId, doctorId, patientId);
        const now = Date.now();
        const cachedAt = cacheTimestamps.get(patientKey) || 0;
        const isStale = now - cachedAt > CACHE_TTL;

        if (!forceRefresh && patientCache.has(patientKey) && !isStale) {
            cacheMissLogger.recordHit();
            promoteCacheEntry(patientKey);
            return patientCache.get(patientKey)!;
        }
        cacheMissLogger.recordMiss();

        const existingRequest = inFlightRequests.get(patientKey);
        if (existingRequest) {
            return existingRequest;
        }

        const versionAtRequestStart = getCacheVersion(patientKey);
        const request = (async () => {
            try {
                const details = await PatientService.getPatientDetails(patientId);
                // Avoid stale write after invalidate/update races.
                if (versionAtRequestStart === getCacheVersion(patientKey)) {
                    setCacheEntry(patientKey, details);
                }
                return details;
            } catch (error) {
                throw normalizeApiError(error);
            } finally {
                inFlightRequests.delete(patientKey);
            }
        })();

        inFlightRequests.set(patientKey, request);
        return request;
    },

    /**
     * Update patient and invalidate cached profile.
     * UI should route patient mutations through repository methods.
     */
    async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
        assertTenantContext('updatePatient');
        try {
            requireTenantContext();
            const updated = await PatientService.updatePatient(patientId, updates);
            PatientRepository.invalidate(patientId);
            return updated;
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async searchPatients(query: string, debounceMs?: number): Promise<Patient[]> {
        assertTenantContext('searchPatients');
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return [];

        const { clinicId, doctorId } = requireTenantContext();
        const searchKey = buildScopedSearchKey(clinicId, doctorId, trimmedQuery);
        const existingInFlight = inFlightSearchRequests.get(searchKey);
        if (existingInFlight) {
            return existingInFlight;
        }

        const existingTimer = searchDebounceTimers.get(searchKey);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        return new Promise<Patient[]>((resolve, reject) => {
            const waiters = pendingSearchWaiters.get(searchKey) || [];
            waiters.push({ resolve, reject });
            pendingSearchWaiters.set(searchKey, waiters);

            const timer = setTimeout(() => {
                searchDebounceTimers.delete(searchKey);

                const request = (async () => {
                    try {
                        const results = await PatientService.searchPatients(clinicId, trimmedQuery);
                        if (__DEV__ && results.length >= DEV_LARGE_SEARCH_WARN_THRESHOLD) {
                            console.warn(
                                `[PatientRepository] Search returned large dataset (${results.length}) for query "${trimmedQuery}".`
                            );
                        }
                        return results;
                    } catch (error) {
                        throw normalizeApiError(error);
                    } finally {
                        inFlightSearchRequests.delete(searchKey);
                    }
                })();

                inFlightSearchRequests.set(searchKey, request);
                void request
                    .then((results) => {
                        const listeners = pendingSearchWaiters.get(searchKey) || [];
                        pendingSearchWaiters.delete(searchKey);
                        for (const listener of listeners) {
                            listener.resolve(results);
                        }
                    })
                    .catch((error) => {
                        const listeners = pendingSearchWaiters.get(searchKey) || [];
                        pendingSearchWaiters.delete(searchKey);
                        for (const listener of listeners) {
                            listener.reject(error);
                        }
                    });
            }, getSearchDebounceMs(debounceMs));

            searchDebounceTimers.set(searchKey, timer);
        });
    },

    /**
     * Invalidate cache for a specific patient
     */
    invalidate(patientId: string) {
        assertTenantContext('invalidate');
        const { clinicId, doctorId } = requireTenantContext();
        const patientKey = buildScopedPatientKey(clinicId, doctorId, patientId);
        bumpCacheVersion(patientKey);
        patientCache.delete(patientKey);
        cacheTimestamps.delete(patientKey);
        inFlightRequests.delete(patientKey);
    },

    /**
     * Clear all cached patients
     */
    clearCache() {
        assertTenantContext('clearCache');
        const { clinicId, doctorId } = requireTenantContext();
        const prefix = `${clinicId}:${doctorId}:`;

        for (const key of patientCache.keys()) {
            if (!key.startsWith(prefix)) continue;
            patientCache.delete(key);
            cacheTimestamps.delete(key);
            inFlightRequests.delete(key);
            cacheVersions.delete(key);
        }

        for (const key of inFlightSearchRequests.keys()) {
            if (key.startsWith(prefix)) {
                inFlightSearchRequests.delete(key);
            }
        }

        for (const [key, timer] of searchDebounceTimers.entries()) {
            if (!key.startsWith(prefix)) continue;
            clearTimeout(timer);
            searchDebounceTimers.delete(key);
        }

        for (const key of pendingSearchWaiters.keys()) {
            if (key.startsWith(prefix)) {
                pendingSearchWaiters.delete(key);
            }
        }
    },

    getDebugStats() {
        return {
            cacheSize: patientCache.size,
            inFlightCount: inFlightRequests.size,
            inFlightSearchCount: inFlightSearchRequests.size,
            pendingSearchDebounces: searchDebounceTimers.size,
        };
    }
};
