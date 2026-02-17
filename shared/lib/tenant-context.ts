import { APP_ERROR_CODES, AppError } from './app-error';
import { useSessionStore } from '@/stores/session-store';

export interface TenantContext {
    doctorId: string;
    clinicId: string;
}

export function getTenantContext(): TenantContext | null {
    const state = useSessionStore.getState();
    const doctorId = state.doctorId;
    const clinicId = state.clinicId;

    if (!doctorId || !clinicId) return null;
    return { doctorId, clinicId };
}

export function requireTenantContext(): TenantContext {
    const context = getTenantContext();
    if (__DEV__ && !context) {
        console.warn('[TenantContext] Missing tenant context while resolving repository operation.');
    }
    if (!context?.clinicId) {
        throw new AppError({
            code: APP_ERROR_CODES.TENANT_CONTEXT_MISSING,
            message: 'Missing clinic context in session.',
            isRetryable: false,
        });
    }
    if (!context?.doctorId) {
        throw new AppError({
            code: APP_ERROR_CODES.TENANT_CONTEXT_MISSING,
            message: 'Missing doctor context in session.',
            isRetryable: false,
        });
    }
    return context;
}
