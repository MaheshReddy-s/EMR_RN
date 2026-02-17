import { API_ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api-client';
import { Platform } from 'react-native';

// Re-export types from centralized entity definitions for backward compatibility
export type { Appointment } from '@/entities/appointment/types';
import type { Appointment } from '@/entities/appointment/types';

export const AppointmentService = {
    /**
     * Get appointments for a specific doctor and date
     * @param doctorId Doctor's ID
     * @param date Date as Unix timestamp (seconds?)
     */
    async getAppointments(doctorId: string, date: number): Promise<Appointment[]> {
        // Swift code uses Int64 for date, likely Unix timestamp
        return api.get<Appointment[]>(API_ENDPOINTS.APPOINTMENTS.LIST_BY_DATE(doctorId, date));
    },

    /**
     * Book a new appointment
     * Matches Swift: registerAppointment(patientID:doctorID:date:)
     */
    async createAppointment(payload: {
        patient_id: string;
        doctor_id: string;
        appointment_date: number; // Unix timestamp in seconds
        appointment_type?: string;
        reason_to_visit?: string;
        appointment_source?: string;
        device?: string;
    }): Promise<Appointment> {
        return api.post<Appointment>(API_ENDPOINTS.APPOINTMENTS.REGISTER, {
            ...payload,
            reason_to_visit: payload.reason_to_visit || 'Consultation',
            device: payload.device || (Platform.OS === 'ios' ? 'iPad' : 'Android'),
            appointment_source: payload.appointment_source || 'walkin',
            appointment_type: payload.appointment_type || 'walkin'
        });
    }
};
