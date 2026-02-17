/**
 * Centralized User & Auth entity types.
 * ──────────────────────────────────────
 * Single source of truth for user-related interfaces.
 * Previously defined in services/auth-service.ts.
 *
 * MIGRATION NOTE: auth-service.ts re-exports these types
 * for backward compatibility during the transition.
 */

export interface ClinicDetails {
    _id?: string;
    clinic_name?: string;
    clinic_logo_url?: string;
    header_image_path?: string;
    footer_image_path?: string;
    file_encryption_key?: string;
    address?: string;
}

export interface User {
    id?: string;
    _id?: string;
    first_name: string;
    last_name: string;
    email: string;
    qualification?: string;
    registration_no?: string;
    department?: string;
    designation?: string;
    gender?: string;
    age?: string;
    prefix?: string;
    phone_no?: string;
    clinic?: string;
    clinic_id?: string;
    role?: string;
    permissions?: string[];
    clinic_name?: string;
    address?: string;
    clinicDetails?: ClinicDetails;
}

export interface LoginResponse extends User {
    token: {
        access: string;
        refresh: string;
    };
    msg?: string;
}
