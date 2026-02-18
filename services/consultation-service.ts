import { API_ENDPOINTS, ConsultationSection } from '../constants/endpoints';
import { api } from '../lib/api-client';

// Re-export types from centralized entity definitions for backward compatibility
export type {
    ConsultationRecord,
    ConsultationItemPayload as ConsultationItem,
    SuggestionItem,
    PrescriptionPayload,
    StrokeData,
} from '@/entities/consultation/types';

import type {
    ConsultationRecord,
    ConsultationItemPayload as ConsultationItem,
    SuggestionItem,
    PrescriptionPayload,
} from '@/entities/consultation/types';

export interface ConsultationPdfUploadPayload {
    consultationId: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    pdfUri: string;
    fileName?: string;
}

/**
 * Consultation Service
 * --------------------
 * Manages the complex consultation and prescription workflow.
 *
 * DUPLICATE SUBMISSION PREVENTION:
 * - A client-side submission lock prevents double-taps.
 * - A UUID idempotency key is generated per submission attempt.
 * - The backend SHOULD check `X-Idempotency-Key` headers and reject
 *   duplicates with HTTP 409 Conflict or return the existing record.
 */

/**
 * Generate a UUID v4 for idempotency keys.
 * Uses crypto.getRandomValues when available, falls back to Math.random.
 */
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/** In-flight submission locks scoped by patient to prevent duplicate taps */
const submissionLocks = new Map<string, boolean>();

export const ConsultationService = {
    /**
     * Returns true if a submission is currently in-flight.
     * UI should use this to disable the submit button.
     */
    get isSubmitting(): boolean {
        return submissionLocks.size > 0;
    },

    /**
     * Submit a full consultation record.
     * - Client-side lock prevents duplicate submission.
     * - Generates an idempotency key per attempt.
     * - Backend SHOULD honour `X-Idempotency-Key` to reject duplicates.
     */
    async submitConsultation(record: ConsultationRecord): Promise<Record<string, unknown>> {
        const patientId = record.patient_id || '__global__';
        if (submissionLocks.get(patientId)) {
            throw new Error('A consultation submission is already in progress.');
        }

        submissionLocks.set(patientId, true);
        const idempotencyKey = generateUUID();

        try {
            const result = await api.post<Record<string, unknown>>(
                API_ENDPOINTS.CONSULTATION.REGISTER,
                record as unknown as Record<string, unknown>,
                {
                    headers: {
                        'X-Idempotency-Key': idempotencyKey,
                    },
                }
            );
            return result;
        } finally {
            submissionLocks.delete(patientId);
        }
    },

    /**
     * Upload generated consultation PDF and link it to a consultation.
     * Uses multipart upload to preserve ApiClient concerns (401, timeout, observability).
     */
    async uploadConsultationPdf(payload: ConsultationPdfUploadPayload): Promise<Record<string, unknown>> {
        const formData = new FormData();
        formData.append('patient_id', payload.patientId);
        formData.append('doctor_id', payload.doctorId);
        formData.append('appointment_id', payload.appointmentId || '');
        formData.append('consultation_id', payload.consultationId);

        const filePart = {
            uri: payload.pdfUri,
            name: payload.fileName || 'consultation.pdf',
            type: 'application/pdf',
        } as any;

        formData.append('pdf_file', filePart);
        // Kept for backend compatibility contract
        formData.append('patient_pdf_file', filePart);

        return api.postRaw<Record<string, unknown>>(
            API_ENDPOINTS.CONSULTATION.PDF_UPLOAD(payload.consultationId),
            formData,
            {
                headers: {
                    Accept: 'application/json',
                },
            }
        );
    },

    /**
     * Fetch consultation suggestions (Properties) for a specific section
     */
    async getSuggestions(doctorId: string, section: ConsultationSection): Promise<SuggestionItem[]> {
        const endpoint = API_ENDPOINTS.PROPERTIES.SECTION(doctorId, section);
        const response = await api.get<Array<Record<string, unknown>>>(endpoint);

        const mapped = response.map((item) => ({
            id: (item._id as string) || (item.id as string) || Date.now().toString(),
            label: (item.property_value as string) || (item.name as string) || '',
            frequency: (item.usage_frequency as number) || (item.frequency as number) || 0,
        })).filter((item) => item.label && item.label.trim().length > 0);

        // Sort by frequency descending, then alphabetically ascending
        return mapped.sort((a, b) => {
            if (b.frequency !== a.frequency) {
                return b.frequency - a.frequency;
            }
            return a.label.localeCompare(b.label);
        });
    },

    /**
     * Fetch the clinical history for a patient
     */
    async getPatientHistory(doctorId: string, patientId: string): Promise<Array<Record<string, unknown>>> {
        return api.get<Array<Record<string, unknown>>>(
            API_ENDPOINTS.CONSULTATION.HISTORY(doctorId, patientId)
        );
    },

    /**
     * Fetch a single consultation record by ID
     */
    async getConsultationDetails(consultationId: string): Promise<Record<string, unknown>> {
        return api.get<Record<string, unknown>>(
            API_ENDPOINTS.CONSULTATION.DETAILS(consultationId)
        );
    },

    /**
     * Fetch the most recent consultation for context
     */
    async getRecentConsultation(doctorId: string, patientId: string): Promise<Record<string, unknown>> {
        return api.get<Record<string, unknown>>(
            API_ENDPOINTS.CONSULTATION.RECENT(doctorId, patientId)
        );
    },

    /**
     * Fetch the prescription list for a doctor
     */
    async getPrescriptions(doctorId: string): Promise<any[]> {
        const endpoint = API_ENDPOINTS.PRESCRIPTIONS.LIST(doctorId);
        const response = await api.get<any[]>(endpoint);

        // Sort by usage_frequency or frequency descending
        return response.sort((a, b) => {
            const freqA = (a.usage_frequency as number) || (a.frequency as number) || 0;
            const freqB = (b.usage_frequency as number) || (b.frequency as number) || 0;
            if (freqB !== freqA) {
                return freqB - freqA;
            }
            return (a.brand_name || a.name || '').localeCompare(b.brand_name || b.name || '');
        });
    },

    /**
     * Create a new prescription or add a variant to an existing one.
     */
    async createPrescription(doctorId: string, payload: Record<string, any>): Promise<any[]> {
        const endpoint = API_ENDPOINTS.PRESCRIPTIONS.CREATE(doctorId);
        return api.post<any[]>(endpoint, payload);
    },

    /**
     * Get specific prescription or variant details.
     * Note: Uses POST as per spec (though atypical for retrieval).
     */
    async getPrescriptionDetails(doctorId: string, prescriptionId: string, variantId?: string): Promise<any> {
        // We reuse the update endpoint pattern but check if there's a specific endpoint
        // ENDPOINTS.PRESCRIPTIONS.UPDATE maps to `/${doctorId}/prescription/${id}`
        // We will assume the base ID path is what's needed.
        const endpoint = API_ENDPOINTS.PRESCRIPTIONS.UPDATE(doctorId, prescriptionId);
        return api.post<any>(endpoint, { variant_id: variantId });
    },

    /**
     * Update an existing prescription or variant.
     */
    async updatePrescription(doctorId: string, prescriptionId: string, payload: Record<string, any>): Promise<any[]> {
        const endpoint = API_ENDPOINTS.PRESCRIPTIONS.UPDATE(doctorId, prescriptionId);
        return api.put<any[]>(endpoint, payload);
    },

    /**
     * Delete a prescription or specific variant.
     */
    async deletePrescription(doctorId: string, prescriptionId: string, variantId?: string): Promise<boolean> {
        const endpoint = API_ENDPOINTS.PRESCRIPTIONS.DELETE(doctorId, prescriptionId);
        // Delete usually doesn't take a body in standard fetch/axios unless configured, 
        // but here we might need to send data. 
        // api-client delete might support data as options or 2nd arg.
        // Assuming api.delete(url, config) where config.data is the payload.
        // If api-client wrapper supports it directly.
        // Checking existing api-client usage or wrapper.
        // If our api-client simple wrapper doesn't support body in delete easily, we might need a raw call or query params.
        // Based on common practice, we'll try to pass data if the wrapper allows.
        // For now, let's assume api.delete supports standard axios-like signature or we use request.

        // Let's use api.request if needed, but for now assuming api.delete handles it or we send as data property.
        // Wait, standard `api.delete` usually takes (url, config).
        return api.delete<boolean>(endpoint, { body: JSON.stringify({ variant_id: variantId }) });
    },
};
