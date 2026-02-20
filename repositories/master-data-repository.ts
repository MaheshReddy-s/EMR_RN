import {
    MasterDataCategory,
    MasterDataItem,
    MasterDataValue,
    MasterDataService,
} from '@/services/master-data-service';
import { APP_ERROR_CODES } from '@/shared/lib/app-error';
import { createCacheMissRateLogger } from '@/shared/lib/cache-observability';
import { normalizeApiError } from '@/shared/lib/error-normalizer';
import { getTenantContext, requireTenantContext } from '@/shared/lib/tenant-context';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_MASTER_DATA_CACHE_SIZE = Number(process.env.EXPO_PUBLIC_MASTER_DATA_CACHE_MAX || 180);
const masterDataCache = new Map<string, MasterDataItem[]>();
const masterDataTimestamps = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<MasterDataItem[]>>();
const cacheMissLogger = createCacheMissRateLogger('MasterDataRepository:getItems');

function assertTenantContext(methodName: string): void {
    if (__DEV__ && !getTenantContext()) {
        console.warn(`[MasterDataRepository] ${methodName} called without tenant context.`);
    }
}

function getMaxMasterDataCacheSize(): number {
    if (Number.isFinite(MAX_MASTER_DATA_CACHE_SIZE) && MAX_MASTER_DATA_CACHE_SIZE > 0) {
        return MAX_MASTER_DATA_CACHE_SIZE;
    }
    return 180;
}

function getCacheKey(clinicId: string, doctorId: string, category: MasterDataCategory): string {
    return `${clinicId}:${doctorId}:${category}`;
}

function setCacheEntry(cacheKey: string, items: MasterDataItem[]): void {
    if (masterDataCache.has(cacheKey)) {
        masterDataCache.delete(cacheKey);
    }
    masterDataCache.set(cacheKey, items);
    masterDataTimestamps.set(cacheKey, Date.now());

    const maxSize = getMaxMasterDataCacheSize();
    while (masterDataCache.size > maxSize) {
        const evictedKey = masterDataCache.keys().next().value as string | undefined;
        if (!evictedKey) break;
        masterDataCache.delete(evictedKey);
        masterDataTimestamps.delete(evictedKey);
        inFlightRequests.delete(evictedKey);
        if (__DEV__) {
            console.warn(
                `[MasterDataRepository] FIFO eviction: removed cache entry "${evictedKey}" (max=${maxSize}).`
            );
        }
    }
}

function isFresh(cacheKey: string): boolean {
    const cachedAt = masterDataTimestamps.get(cacheKey) || 0;
    return Date.now() - cachedAt <= CACHE_TTL_MS;
}

export const MasterDataRepository = {
    async getItems(
        category: MasterDataCategory,
        forceRefresh = false
    ): Promise<MasterDataItem[]> {
        assertTenantContext('getItems');
        const { clinicId, doctorId } = requireTenantContext();
        const cacheKey = getCacheKey(clinicId, doctorId, category);

        if (!forceRefresh && masterDataCache.has(cacheKey) && isFresh(cacheKey)) {
            cacheMissLogger.recordHit();
            return masterDataCache.get(cacheKey)!;
        }
        cacheMissLogger.recordMiss();

        const existing = inFlightRequests.get(cacheKey);
        if (existing) return existing;

        const request = (async () => {
            try {
                const items = await MasterDataService.getItems(doctorId, category);
                setCacheEntry(cacheKey, items);
                return items;
            } catch (error) {
                const appError = normalizeApiError(error);
                if (__DEV__) {
                    console.error(`[MasterDataRepository] getItems failed (${category})`, appError);
                }
                if (appError.code === APP_ERROR_CODES.NOT_FOUND) {
                    if (__DEV__) {
                        console.warn(`[MasterDataRepository] getItems (${category}) resolved as empty dataset (not found).`);
                    }
                    return [];
                }
                throw appError;
            } finally {
                inFlightRequests.delete(cacheKey);
            }
        })();

        inFlightRequests.set(cacheKey, request);
        return request;
    },

    async addItem(category: MasterDataCategory, value: MasterDataValue): Promise<boolean> {
        assertTenantContext('addItem');
        try {
            const { doctorId } = requireTenantContext();
            await MasterDataService.addItem(doctorId, category, value);
            MasterDataRepository.invalidate(category);
            return true;
        } catch (error) {
            const appError = normalizeApiError(error);
            if (__DEV__) {
                console.error(`[MasterDataRepository] addItem failed (${category})`, appError);
            }
            throw appError;
        }
    },

    async updateItem(
        category: MasterDataCategory,
        id: string,
        value: MasterDataValue
    ): Promise<boolean> {
        assertTenantContext('updateItem');
        try {
            const { doctorId } = requireTenantContext();
            await MasterDataService.updateItem(doctorId, category, id, value);
            MasterDataRepository.invalidate(category);
            return true;
        } catch (error) {
            const appError = normalizeApiError(error);
            if (__DEV__) {
                console.error(`[MasterDataRepository] updateItem failed (${category})`, appError);
            }
            throw appError;
        }
    },

    async deleteItem(category: MasterDataCategory, id: string): Promise<boolean> {
        assertTenantContext('deleteItem');
        try {
            const { doctorId } = requireTenantContext();
            await MasterDataService.deleteItem(doctorId, category, id);
            MasterDataRepository.invalidate(category);
            return true;
        } catch (error) {
            const appError = normalizeApiError(error);
            if (__DEV__) {
                console.error(`[MasterDataRepository] deleteItem failed (${category})`, appError);
            }
            throw appError;
        }
    },

    invalidate(category?: MasterDataCategory): void {
        assertTenantContext('invalidate');
        const { clinicId, doctorId } = requireTenantContext();
        if (category) {
            const key = getCacheKey(clinicId, doctorId, category);
            masterDataCache.delete(key);
            masterDataTimestamps.delete(key);
            inFlightRequests.delete(key);
            return;
        }

        const prefix = `${clinicId}:${doctorId}:`;
        for (const key of masterDataCache.keys()) {
            if (key.startsWith(prefix)) {
                masterDataCache.delete(key);
                masterDataTimestamps.delete(key);
                inFlightRequests.delete(key);
            }
        }
    },

    clearCache(): void {
        assertTenantContext('clearCache');
        MasterDataRepository.invalidate();
    },
};

export type { MasterDataItem, MasterDataCategory };
