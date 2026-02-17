import { api, ApiObservabilityHooks } from '@/lib/api-client';

export const RuntimeRepository = {
    setOnUnauthorized(callback: (() => void) | null): void {
        api.setOnUnauthorized(callback);
    },

    setObservabilityHooks(hooks: ApiObservabilityHooks | null): void {
        api.setObservabilityHooks(hooks);
    },

    getAuthToken(): string | null {
        return api.getToken();
    },
};

export type { ApiObservabilityHooks };
