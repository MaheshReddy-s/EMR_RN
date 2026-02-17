/**
 * Centralized Appointment entity types.
 * ──────────────────────────────────────
 * Single source of truth for appointment-related interfaces.
 * Previously defined in:
 *   - services/appointment-service.ts (API-level Appointment)
 *   - app/(app)/dashboard.tsx (UI-level Appointment)
 */
import { Patient } from '@/entities/patient/types';

/** API-level appointment shape returned from the backend */
export interface Appointment {
    _id: string;
    doctor_id: string;
    patient_id?: string;
    patient?: Patient;
    apt_timestamp: number; // Unix timestamp in seconds
    is_consulted?: boolean;
    appointment_type?: string;
    reason_to_visit?: string;
}

/** UI-level appointment shape used by the dashboard */
export interface AppointmentUIModel {
    id: string;
    patientId: string;
    patientName: string;
    patientMobile: string;
    status: 'scheduled' | 'new-patient' | 'completed' | 'in-progress';
    time: string;
    type?: string;
    isConsulted?: boolean;
}

/** Payload for creating a new appointment */
export interface CreateAppointmentPayload {
    patient_id: string;
    doctor_id: string;
    appointment_date: number; // Unix timestamp in seconds
    appointment_type?: string;
    reason_to_visit?: string;
    appointment_source?: string;
    device?: string;
}
