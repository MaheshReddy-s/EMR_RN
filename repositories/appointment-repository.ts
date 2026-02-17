import { Appointment } from '@/entities';
import { AppointmentService } from '@/services/appointment-service';
import { createCacheMissRateLogger } from '@/shared/lib/cache-observability';
import { normalizeApiError } from '@/shared/lib/error-normalizer';
import { getTenantContext, requireTenantContext } from '@/shared/lib/tenant-context';

const CACHE_TTL_MS = 30 * 1000;
const MAX_APPOINTMENT_CACHE_SIZE = Number(process.env.EXPO_PUBLIC_APPOINTMENT_CACHE_MAX || 180);
const appointmentCache = new Map<string, Appointment[]>();
const appointmentTimestamps = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<Appointment[]>>();
const cacheMissLogger = createCacheMissRateLogger('AppointmentRepository:getAppointments');

function assertTenantContext(methodName: string): void {
    if (__DEV__ && !getTenantContext()) {
        console.warn(`[AppointmentRepository] ${methodName} called without tenant context.`);
    }
}

function getMaxAppointmentCacheSize(): number {
    if (Number.isFinite(MAX_APPOINTMENT_CACHE_SIZE) && MAX_APPOINTMENT_CACHE_SIZE > 0) {
        return MAX_APPOINTMENT_CACHE_SIZE;
    }
    return 180;
}

function getCacheKey(clinicId: string, doctorId: string, date: number): string {
    return `${clinicId}:${doctorId}:${date}`;
}

function setCacheEntry(cacheKey: string, appointments: Appointment[]): void {
    if (appointmentCache.has(cacheKey)) {
        appointmentCache.delete(cacheKey);
    }
    appointmentCache.set(cacheKey, appointments);
    appointmentTimestamps.set(cacheKey, Date.now());

    const maxSize = getMaxAppointmentCacheSize();
    while (appointmentCache.size > maxSize) {
        const evictedKey = appointmentCache.keys().next().value as string | undefined;
        if (!evictedKey) break;
        appointmentCache.delete(evictedKey);
        appointmentTimestamps.delete(evictedKey);
        inFlightRequests.delete(evictedKey);
        if (__DEV__) {
            console.warn(
                `[AppointmentRepository] FIFO eviction: removed cache entry "${evictedKey}" (max=${maxSize}).`
            );
        }
    }
}

function isFresh(cacheKey: string): boolean {
    const cachedAt = appointmentTimestamps.get(cacheKey) || 0;
    return Date.now() - cachedAt <= CACHE_TTL_MS;
}

export const AppointmentRepository = {
    async getAppointments(date: number, forceRefresh = false): Promise<Appointment[]> {
        assertTenantContext('getAppointments');
        const { clinicId, doctorId } = requireTenantContext();
        const cacheKey = getCacheKey(clinicId, doctorId, date);

        if (!forceRefresh && appointmentCache.has(cacheKey) && isFresh(cacheKey)) {
            cacheMissLogger.recordHit();
            return appointmentCache.get(cacheKey)!;
        }
        cacheMissLogger.recordMiss();

        const existing = inFlightRequests.get(cacheKey);
        if (existing) return existing;

        const request = (async () => {
            try {
                const data = await AppointmentService.getAppointments(doctorId, date);
                setCacheEntry(cacheKey, data);
                return data;
            } catch (error) {
                throw normalizeApiError(error);
            } finally {
                inFlightRequests.delete(cacheKey);
            }
        })();

        inFlightRequests.set(cacheKey, request);
        return request;
    },

    async createAppointment(payload: {
        patient_id: string;
        appointment_date: number;
        appointment_type?: string;
        reason_to_visit?: string;
        appointment_source?: string;
        device?: string;
    }): Promise<Appointment> {
        assertTenantContext('createAppointment');
        try {
            const tenant = requireTenantContext();
            const appointment = await AppointmentService.createAppointment({
                ...payload,
                doctor_id: tenant.doctorId,
            });
            AppointmentRepository.invalidate();
            return appointment;
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    invalidate(date?: number): void {
        assertTenantContext('invalidate');
        const { clinicId, doctorId } = requireTenantContext();
        if (typeof date === 'number') {
            const key = getCacheKey(clinicId, doctorId, date);
            appointmentCache.delete(key);
            appointmentTimestamps.delete(key);
            inFlightRequests.delete(key);
            return;
        }

        const prefix = `${clinicId}:${doctorId}:`;
        for (const key of appointmentCache.keys()) {
            if (key.startsWith(prefix)) {
                appointmentCache.delete(key);
                appointmentTimestamps.delete(key);
                inFlightRequests.delete(key);
            }
        }
    },

    clearCache(): void {
        assertTenantContext('clearCache');
        AppointmentRepository.invalidate();
    },
};
