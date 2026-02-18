/**
 * API Configuration and Endpoints
 * ------------------------------
 * This file contains all the backend endpoint paths identified from the 
 * original DocEMR Swift codebase. Organized by domain for maintainability.
 *
 * Issue #18: Environment-based API base URL.
 * Set EXPO_PUBLIC_API_BASE_URL in your .env file to configure per-environment.
 */

export const API_BASE_URL: string =
    process.env.EXPO_PUBLIC_API_BASE_URL || 'https://emrdevapi.makonissoft.com/v1';

export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/login',
        REGISTER: '/register',
        LOGOUT: '/logout',
    },

    // Doctor Profile
    DOCTOR: {
        UPDATE: (doctorId: string) => `/doctor/${doctorId}`,
    },

    // Patients
    PATIENTS: {
        LIST: (doctorId: string) => `/${doctorId}/patients`,
        REGISTER: (doctorId: string) => `/${doctorId}/patient/register`,
        SEARCH: (doctorId: string) => `/patient/search`,
        ALL_PATIENT_DOCS: (clinicId: string, patientId: string) => `/all-patients-docs/${clinicId}/${patientId}`,
        DETAILS: (patientId: string) => `/patient/${patientId}`,
        UPDATE: (patientId: string) => `/patient/${patientId}`,
        DELETE: (patientId: string) => `/patient/${patientId}`,
    },

    // Appointments
    APPOINTMENTS: {
        LIST_BY_DATE: (doctorId: string, date: number | string) => `/${doctorId}/${date}/appointment`,
        LIST_ALL: '/appointment/list',
        REGISTER: '/appointment',
    },

    // Prescriptions (Master Data & per Doctor)
    PRESCRIPTIONS: {
        LIST: (doctorId: string) => `/${doctorId}/prescription`,
        CREATE: (doctorId: string) => `/${doctorId}/prescription`,
        UPDATE: (doctorId: string, id: string) => `/${doctorId}/prescription/${id}`,
        DELETE: (doctorId: string, id: string) => `/${doctorId}/prescription/${id}`,
    },

    // Properties (Suggestions for Consultation Sections)
    PROPERTIES: {
        LIST_ALL: '/properties',
        LIST_BY_DOCTOR: (doctorId: string) => `/properties/${doctorId}`,
        ADD_PROPERTY: (doctorId: string) => `/${doctorId}/properties`,
        UPDATE_OR_DELETE: (doctorId: string, section: ConsultationSection) => `/properties/${doctorId}/${section}`,

        // Section specific suggestions
        SECTION: (doctorId: string, section: ConsultationSection) => `/properties/${doctorId}/${section}`,
    },

    // Consultation
    CONSULTATION: {
        REGISTER: '/consultation',
        DETAILS: (id: string) => `/consultation/${id}`,
        PDF_UPLOAD: (consultationId: string) => `/consultation-history/${consultationId}`,
        HISTORY: (doctorId: string, patientId: string) => `/consultation/history/${doctorId}/${patientId}`,
        RECENT: (doctorId: string, patientId: string) => `/consultation/recent-history/${doctorId}/${patientId}`,
        PDF_DOWNLOAD: (fileName: string) => `/consultation/history/${fileName}`,
        DELETE_HISTORY: (consultationId: string, historyId: string) => `/consultation/${consultationId}/${historyId}`,
    },

    SETTINGS: {
        GET: (clinicId: string, doctorId: string) => `/settings/${clinicId}/${doctorId}`,
        UPDATE: (clinicId: string, doctorId: string) => `/settings/${clinicId}/${doctorId}`,
    },
} as const;

/**
 * Valid consultation sections that have individual property endpoints
 */
export type ConsultationSection =
    | 'diagnosis'
    | 'complaints'
    | 'examination'
    | 'instruction'
    | 'investigation'
    | 'notes'
    | 'procedure';

/**
 * API Response Utility Types
 */
export interface ApiResponse<T> {
    status: 'success' | 'error';
    message?: string;
    data: T;
}

export interface ApiError {
    code: number;
    message: string;
    errors?: Record<string, string[]>;
}
