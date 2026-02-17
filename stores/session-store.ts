import { create } from 'zustand';
import { User } from '@/entities/user/types';
import { APP_ERROR_CODES, AppError } from '@/shared/lib/app-error';

/**
 * Session Store
 * ─────────────
 * Centralized Zustand store for managing user session state.
 * 
 * This provides a reactive layer over AuthService's persistent storage.
 * Screens should use this hook to respond to login/logout events.
 */

interface SessionState {
    /** The currently logged-in user profile */
    user: User | null;
    /** JWT Access Token */
    token: string | null;
    /** Simplified flag for auth guards */
    isAuthenticated: boolean;
    /** Loading state for session restoration */
    isRestoring: boolean;
    /** Role-ready shape (Phase C prep) */
    role: string | null;
    permissions: string[];
    /** Multi-tenant context */
    doctorId: string | null;
    clinicId: string | null;

    /** Update the current session */
    setSession: (user: User, token: string) => void;
    /** Clear the session (logout) */
    clearSession: () => void;
    /** Update restoring state */
    setRestoring: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isRestoring: true,
    role: null,
    permissions: [],
    doctorId: null,
    clinicId: null,

    setSession: (user, token) => {
        const doctorId = user.id;
        const clinicId = user.clinic_id;

        if (!doctorId || !clinicId) {
            throw new AppError({
                code: APP_ERROR_CODES.INVALID_SESSION,
                message: 'Invalid session payload: missing doctor or clinic identity.',
                isRetryable: false,
            });
        }

        set({
            user,
            token,
            isAuthenticated: !!token,
            isRestoring: false,
            role: user.role || null,
            permissions: Array.isArray(user.permissions) ? user.permissions : [],
            doctorId,
            clinicId,
        });
    },

    clearSession: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
        isRestoring: false,
        role: null,
        permissions: [],
        doctorId: null,
        clinicId: null,
    }),

    setRestoring: (loading) => set((state) => {
        if (state.isRestoring === loading) return state;
        return { isRestoring: loading };
    }),
}));
