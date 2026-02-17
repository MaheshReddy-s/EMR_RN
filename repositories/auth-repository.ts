import type { User } from '@/entities';
import { AuthService } from '@/services/auth-service';
import { normalizeApiError } from '@/shared/lib/error-normalizer';
import { requireTenantContext } from '@/shared/lib/tenant-context';

export const AuthRepository = {
    async login(email: string, password: string): Promise<User> {
        try {
            return await AuthService.login(email, password);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async restoreSession(): Promise<User | null> {
        try {
            return await AuthService.restoreSession();
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async clearLocalSession(): Promise<void> {
        try {
            await AuthService.clearLocalSession();
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async logout(): Promise<void> {
        try {
            await AuthService.logout();
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async updateDoctorProfile(payload: Record<string, unknown>): Promise<any> {
        const { doctorId } = requireTenantContext();
        try {
            return await AuthService.updateDoctorProfile(doctorId, payload);
        } catch (error) {
            throw normalizeApiError(error);
        }
    },

    async getFileEncryptionKey(): Promise<string | null> {
        return AuthService.getFileEncryptionKey();
    },
};

export type { User };
