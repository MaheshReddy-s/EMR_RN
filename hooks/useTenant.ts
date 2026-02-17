import { useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';

export interface TenantInfo {
    doctorId: string | null;
    clinicId: string | null;
    hasTenantContext: boolean;
}

export function useTenant(): TenantInfo {
    const doctorId = useSessionStore((state) => state.doctorId);
    const clinicId = useSessionStore((state) => state.clinicId);

    return useMemo(() => ({
        doctorId,
        clinicId,
        hasTenantContext: Boolean(doctorId && clinicId),
    }), [clinicId, doctorId]);
}

