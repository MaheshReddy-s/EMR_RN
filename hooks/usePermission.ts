import { useCallback, useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';

export function usePermission() {
    const role = useSessionStore((state) => state.role);
    const permissions = useSessionStore((state) => state.permissions);

    const permissionSet = useMemo(() => new Set(permissions), [permissions]);

    const hasPermission = useCallback((permission: string): boolean => {
        return permissionSet.has(permission);
    }, [permissionSet]);

    const hasAnyPermission = useCallback((required: string[]): boolean => {
        return required.some((permission) => permissionSet.has(permission));
    }, [permissionSet]);

    const hasAllPermissions = useCallback((required: string[]): boolean => {
        return required.every((permission) => permissionSet.has(permission));
    }, [permissionSet]);

    const hasRole = useCallback((requiredRole: string): boolean => {
        return role === requiredRole;
    }, [role]);

    return {
        role,
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
    };
}

