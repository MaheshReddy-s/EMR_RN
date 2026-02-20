import { API_ENDPOINTS } from '@/constants/endpoints';
import * as SecureStore from 'expo-secure-store';
import { api } from '../lib/api-client';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import { APP_ERROR_CODES, AppError } from '@/shared/lib/app-error';

/**
 * Authentication Service
 * ----------------------
 * Handles login, registration, and token persistence.
 *
 * SECURITY NOTES:
 * - Passwords are transmitted plaintext over HTTPS (enforced).
 * - Backend MUST hash passwords using bcrypt or argon2 before storage.
 * - TEMPORARY: Client-side encryption is enabled to support legacy backend logic.
 *   This should be removed once backend is updated to accept plaintext passwords.
 * - Secrets must never be committed to source code.
 */

// Re-export types from centralized entity definitions for backward compatibility
export type { ClinicDetails, User, LoginResponse } from '@/entities/user/types';
import type { User, LoginResponse } from '@/entities/user/types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const FILE_ENCRYPTION_KEY = 'file_encryption_key';
let restorePromise: Promise<User | null> | null = null;
let hasAttemptedRestore = false;

import { useSessionStore } from '../stores/session-store';

function normalizeSessionUser(source: User): User {
    const doctorId = typeof source.id === 'string' && source.id.trim().length > 0
        ? source.id
        : (typeof source._id === 'string' && source._id.trim().length > 0 ? source._id : null);
    const clinicId = typeof source.clinic_id === 'string' && source.clinic_id.trim().length > 0
        ? source.clinic_id
        : (typeof source.clinic === 'string' && source.clinic.trim().length > 0 ? source.clinic : null);

    if (!doctorId || !clinicId) {
        throw new AppError({
            code: APP_ERROR_CODES.INVALID_SESSION,
            message: 'Invalid session payload: missing doctor or clinic identity.',
            isRetryable: false,
        });
    }

    return {
        ...source,
        id: doctorId,
        clinic_id: clinicId,
        _id: source._id || doctorId,
        clinic: source.clinic || clinicId,
    };
}

// Storage Helper
const Storage = {
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            return await SecureStore.getItemAsync(key);
        }
    },
    async deleteItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
};

export const AuthService = {
    /**
     * Authenticate user and store credentials.
     * Password is sent encrypted (client-side) to match legacy backend requirement.
     * HTTPS protects the transport layer.
     */
    async login(email: string, password: string): Promise<User> {
        // Legacy Encryption logic
        // TODO: Remove this once backend is updated (See HARDENING_REPORT.md)
        const key = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || ''; // Fallback empty to avoid crash, but login will fail if missing
        const iv = process.env.EXPO_PUBLIC_ENCRYPTION_IV || '';

        if (!key || !iv) {
            console.warn('Missing Encryption Keys for Legacy Login');
        }

        const keyUtf8 = CryptoJS.enc.Utf8.parse(key);
        const ivUtf8 = CryptoJS.enc.Utf8.parse(iv);

        const encryptedPassword = CryptoJS.AES.encrypt(password, keyUtf8, {
            iv: ivUtf8,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString();

        const response = await api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
            email,
            password: encryptedPassword,
        });

        const user = normalizeSessionUser(response);

        // Store token in current session and persistent storage
        const token = response.token?.access;
        if (!token) throw new Error('No access token received from server');

        api.setToken(token);
        await Storage.setItem(TOKEN_KEY, token);

        await Storage.setItem(USER_KEY, JSON.stringify(user));

        // Store file encryption key from clinicDetails for PDF decryption
        const fileEncKey = (response as any).clinicDetails?.file_encryption_key;
        if (fileEncKey) {
            await Storage.setItem(FILE_ENCRYPTION_KEY, fileEncKey);
        }

        // Update Store
        useSessionStore.getState().setSession(user, token);
        hasAttemptedRestore = true;

        return user;
    },

    /**
     * Restore session from storage on app launch.
     * Syncs with Zustand store to provide reactive state.
     */
    async restoreSession(): Promise<User | null> {
        const { user: currentStoredUser, token: currentStoredToken } = useSessionStore.getState();
        if (currentStoredUser && currentStoredToken) {
            hasAttemptedRestore = true;
            return currentStoredUser;
        }

        if (restorePromise) {
            return restorePromise;
        }
        if (hasAttemptedRestore) {
            useSessionStore.getState().setRestoring(false);
            return null;
        }

        hasAttemptedRestore = true;
        useSessionStore.getState().setRestoring(true);

        restorePromise = (async () => {
            try {
                const token = await Storage.getItem(TOKEN_KEY);
                const userJson = await Storage.getItem(USER_KEY);

                if (token && userJson) {
                    const storedUser = JSON.parse(userJson) as User;
                    const user = normalizeSessionUser(storedUser);
                    api.setToken(token);
                    // Populate store
                    useSessionStore.getState().setSession(user, token);

                    // Fetch latest profile silently from the backend to sync signature and details
                    try {
                        const doctorId = user.id;
                        if (doctorId) {
                            const latestData = await api.get<any>(API_ENDPOINTS.DOCTOR.UPDATE(doctorId));
                            if (latestData) {
                                const actualData = latestData.data || latestData;
                                const syncedUser = normalizeSessionUser({ ...user, ...actualData });
                                await Storage.setItem(USER_KEY, JSON.stringify(syncedUser));
                                useSessionStore.getState().setSession(syncedUser, token);
                                return syncedUser;
                            }
                        }
                    } catch (e) {
                        if (__DEV__) console.warn('Failed to sync latest doctor profile on startup:', e);
                    }

                    return user;
                }
            } catch (e) {
                if (__DEV__) {
                    console.error('Failed to restore session', e);
                }
            } finally {
                useSessionStore.getState().setRestoring(false);
                restorePromise = null;
            }
            return null;
        })();

        return restorePromise;
    },

    /**
     * Clear local auth state (API token, store, and persisted keys).
     * Safe to call for forced logout paths (e.g. 401 handling).
     */
    async clearLocalSession(): Promise<void> {
        api.setToken(null);
        useSessionStore.getState().clearSession();
        await Promise.allSettled([
            Storage.deleteItem(TOKEN_KEY),
            Storage.deleteItem(USER_KEY),
            Storage.deleteItem(FILE_ENCRYPTION_KEY),
        ]);
        restorePromise = null;
        hasAttemptedRestore = true;
    },

    /**
     * Clear session and storage
     */
    async logout(): Promise<void> {
        try {
            await api.post(API_ENDPOINTS.AUTH.LOGOUT, {});
        } finally {
            await this.clearLocalSession();
        }
    },

    /**
     * Get the file encryption key for PDF decryption.
     * This key comes from clinicDetails.file_encryption_key in the login response.
     */
    async getFileEncryptionKey(): Promise<string | null> {
        return Storage.getItem(FILE_ENCRYPTION_KEY);
    },

    async updateDoctorProfile(doctorId: string, payload: any): Promise<any> {
        const result = await api.put<any>(API_ENDPOINTS.DOCTOR.UPDATE(doctorId), payload);

        // Refresh session data in store if user profile was updated
        const { user: currentUser, token: currentToken } = useSessionStore.getState();
        if (currentUser && currentToken) {
            const updatedData = result?.data || result;
            const updatedUser = { ...currentUser, ...updatedData, ...payload } as User;
            await Storage.setItem(USER_KEY, JSON.stringify(updatedUser));
            useSessionStore.getState().setSession(updatedUser, currentToken);
        }

        return result;
    },
};
