/**
 * Centralized Patient entity types.
 * ───────────────────────────────────
 * Single source of truth for patient-related interfaces.
 * Previously defined in:
 *   - services/patient-service.ts (canonical Patient)
 *   - components/register-modal.tsx (local Patient)
 *   - components/new-appointment-modal.tsx (local Patient)
 *
 * MIGRATION NOTE: patient-service.ts re-exports the Patient type
 * for backward compatibility. Local interfaces in register-modal
 * and new-appointment-modal are kept as-is for now since they
 * represent a simplified UI model (different shape from API Patient).
 */

/** API-level patient shape returned from the backend */
export interface Patient {
    _id: string;
    patient_name: string;
    patient_mobile: string;
    age?: number | string;
    gender?: string;
    email?: string;
    blood_group?: string;
    address?: string;
    doctor_id?: string;
    summary?: string;
    dob?: string;
    weight?: string;
    height?: string;
    locality?: string;
    pincode?: string;
    created_at?: string;
}

/** Simplified patient shape used by UI components (modals, lists) */
export interface PatientUIModel {
    id: string;
    _id?: string;
    name: string;
    mobile: string;
    age?: number;
    gender?: string;
    email?: string;
}

/** Payload for registering a new patient via the API */
export interface RegisterPatientPayload {
    patient_name: string;
    patient_mobile: string;
    age?: number;
    gender?: string;
    email?: string;
    blood_group?: string;
    address?: string;
}

/** Visit history entry for patient detail screens */
export interface VisitHistory {
    id: string;
    link: string;
    name: string;
    date: string;
    consultationID?: string;
}

/** Asset item for the asset gallery */
export interface Asset {
    id: string;
    url: string;
    type: 'image' | 'pdf';
    date: string;
    label?: string;
}
