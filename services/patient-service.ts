import { API_ENDPOINTS } from '../constants/endpoints';
import { api } from '../lib/api-client';

// Re-export types from centralized entity definitions for backward compatibility
export type { Patient, RegisterPatientPayload } from '@/entities/patient/types';
import type { Patient, RegisterPatientPayload } from '@/entities/patient/types';

/**
 * Patient Service
 * ---------------
 * Handles all patient-related API interactions.
 */

export const PatientService = {
    /**
     * Fetch list of patients for a specific doctor (paginated)
     */
    async getPatients(doctorId: string, after?: string): Promise<{ patients: Patient[], after: string }> {
        let url: string;
        if (after && (after.startsWith('/') || after.startsWith('http'))) {
            // If it's a full URL or absolute path, handle accordingly
            // If it's a full URL, we might need a separate method in ApiClient, 
            // but usually we just need the path part for our ApiClient.
            try {
                const pathPart = after.includes('://') ? new URL(after).pathname + new URL(after).search : after;
                url = pathPart.replace('/v1', '');
            } catch (e) {
                url = after.replace('/v1', '');
            }
        } else {
            url = API_ENDPOINTS.PATIENTS.LIST(doctorId);
            if (after) {
                // If it's just a token/string, append as query param
                url += `${url.includes('?') ? '&' : '?'}page=${after}`;
            }
        }

        if (__DEV__) console.log(`[PatientService] Fetching patients from: ${url}`);
        const data = await api.get<any>(url);

        // 1. Handle Paginated Object: { data: Patient[], next_url: string }
        if (data && Array.isArray(data.data) && data.next_url !== undefined) {
            if (__DEV__) console.log(`[PatientService] Received ${data.data.length} patients from object. Next: ${data.next_url}`);
            return {
                patients: data.data,
                after: data.next_url || ''
            };
        }

        // 2. Handle Paginated Tuple: [Patient[], string] (Legacy support)
        if (Array.isArray(data) && data.length >= 1 && Array.isArray(data[0])) {
            const patients = data[0];
            const nextCursor = (typeof data[1] === 'string') ? data[1] : '';
            if (__DEV__) console.log(`[PatientService] Received ${patients.length} patients from tuple. Next: ${nextCursor}`);
            return {
                patients: patients,
                after: nextCursor
            };
        }

        // 3. Fallback: Flat array
        const patients = Array.isArray(data) ? data : (data?.data || []);
        if (__DEV__) console.log(`[PatientService] Fallback: Received ${patients.length} patients (no pagination metadata)`);
        return {
            patients: patients,
            after: ''
        };
    },

    /**
     * Register a new patient
     */
    async registerPatient(doctorId: string, payload: RegisterPatientPayload): Promise<Patient> {
        const data = await api.post<any>(API_ENDPOINTS.PATIENTS.REGISTER(doctorId), payload as unknown as Record<string, unknown>);
        // Swift uses .patients response type which returns an array, and takes .first
        return Array.isArray(data) ? data[0] : data;
    },

    /**
     * Search for patients by name or mobile
     */
    async searchPatients(clinicId: string, query: string): Promise<Patient[]> {
        try {
            const isMobileNumber = /^\d+$/.test(query);
            const data = await api.post<any>(API_ENDPOINTS.PATIENTS.SEARCH(clinicId), {
                search_by: isMobileNumber ? 'patient_mobile' : 'patient_name',
                value: query
            });

            // Handle both paginated object and flat array
            if (data && data.data && Array.isArray(data.data)) {
                return data.data;
            }
            if (Array.isArray(data) && data.length >= 1 && Array.isArray(data[0])) {
                return data[0];
            }

            return Array.isArray(data) ? data : (data?.data || []);
        } catch (error: any) {
            const isNotFoundError = error.code === 400 &&
                (error.message?.toLowerCase().includes("doesn't exist") ||
                    error.message?.toLowerCase().includes("not found"));

            if (isNotFoundError) {
                return [];
            }
            // For any other error, re-throw so the UI can handle it
            throw error;
        }
    },

    /**
     * Get detailed info for a single patient
     */
    async getPatientDetails(patientId: string): Promise<Patient> {
        const data = await api.get<any>(API_ENDPOINTS.PATIENTS.DETAILS(patientId));
        // Swift: data["patient_details"]
        return data?.patient_details || data;
    },

    /**
     * Update patient records
     */
    async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
        return api.put<Patient>(API_ENDPOINTS.PATIENTS.UPDATE(patientId), updates);
    },

    /**
     * Delete a patient record
     */
    async deletePatient(patientId: string): Promise<void> {
        return api.delete<void>(API_ENDPOINTS.PATIENTS.DELETE(patientId));
    },

    /**
     * Get patient consultation history
     */
    async getPatientHistory(doctorId: string, patientId: string): Promise<any> {
        return api.get<any>(API_ENDPOINTS.CONSULTATION.HISTORY(doctorId, patientId));
    },

    /**
     * Get recent consultation for a patient
     */
    async getRecentConsultation(doctorId: string, patientId: string): Promise<any> {
        return api.get<any>(API_ENDPOINTS.CONSULTATION.RECENT(doctorId, patientId));
    },

    /**
     * Delete a specific consultation history item
     */
    async deleteConsultationHistory(consultationId: string, historyId: string): Promise<void> {
        return api.delete<void>(API_ENDPOINTS.CONSULTATION.DELETE_HISTORY(consultationId, historyId));
    },

    /**
     * Get all patient documents (photos, lab reports, etc)
     */
    async getPatientDocuments(clinicId: string, patientId: string): Promise<any> {
        return api.get<any>(API_ENDPOINTS.PATIENTS.ALL_PATIENT_DOCS(clinicId, patientId));
    }
};
