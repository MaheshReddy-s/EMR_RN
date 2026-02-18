/**
 * Centralized Consultation entity types.
 * ────────────────────────────────────────
 * Single source of truth for all consultation-related interfaces.
 * Previously scattered across:
 *   - types/consultation.ts (partial)
 *   - services/consultation-service.ts (ConsultationItem, PrescriptionPayload, etc.)
 *   - components/consultation/prescription-modal.tsx (PrescriptionVariant, PrescriptionData)
 *   - components/consultation/prescription-edit-modal.tsx (PrescriptionVariant, PrescriptionData)
 *   - components/consultation/drawing-canvas.tsx (StrokeData)
 *   - hooks/useConsultation.ts (TabType, ConsultationState)
 *
 * MIGRATION NOTE: The old locations re-export from here.
 */

// ─── Drawing ─────────────────────────────────────────────────

/** Stroke data for Skia drawing canvas */
export interface StrokeData {
    svg: string;
    color: string;
    width: number;
    blendMode?: any; // Skia BlendMode
}

// ─── Prescription ────────────────────────────────────────────

export interface PrescriptionVariant {
    id: string;
    timings: string;      // e.g. "1-0-0-1"
    dosage: string;       // e.g. "500 mg"
    duration: string;     // e.g. "5 Days"
    type: string;         // e.g. "Tablet"
    instructions?: string;
    purchaseCount?: string;
}

export interface PrescriptionData {
    brandName: string;
    genericName: string;
    variants: PrescriptionVariant[];
}

/** Wire format for sending prescriptions to the API */
export interface PrescriptionPayload {
    brand_name: string;
    generic_name?: string;
    dosage?: string;
    duration?: string;
    drawings?: StrokeData[];
    variants: Array<{
        timings: string;
        dosage: string;
        duration: string;
        type?: string;
        instructions?: string;
    }>;
}

// ─── Consultation Items ──────────────────────────────────────

/** A single item in any consultation section (complaints, diagnosis, etc.) */
export interface ConsultationItem {
    id: string;
    name: string;
    notes?: string;
    genericName?: string;
    drawings?: StrokeData[];
    dosage?: string;
    duration?: string;
    instructions?: string;
    timings?: string;
    height?: number;
    type?: string;
}

/** API-level consultation item (used by consultation-service for submission) */
export interface ConsultationItemPayload {
    name: string;
    notes?: string;
    drawings?: StrokeData[];
    genericName?: string;
}

/** Full consultation record submitted to the backend */
export interface ConsultationRecord {
    doctor_id: string;
    patient_id: string;
    appointment_id: string;
    apt_date?: number;
    start_timestamp?: number;
    next_apt_reason?: string;
    complaints: ConsultationItemPayload[];
    diagnosis: ConsultationItemPayload[];
    examination: ConsultationItemPayload[];
    investigation: ConsultationItemPayload[];
    procedure: ConsultationItemPayload[];
    prescriptions: PrescriptionPayload[];
    instruction: ConsultationItemPayload[];
    notes: ConsultationItemPayload[];
    follow_up_date?: number;
    submittedAt?: string;
    created_at?: string;
}

/** Suggestion item returned from the properties/suggestions API */
export interface SuggestionItem {
    id: string;
    label: string;
    frequency: number;
}

// ─── Tabs & State ────────────────────────────────────────────

export type TabType =
    | 'complaints'
    | 'diagnosis'
    | 'examination'
    | 'investigation'
    | 'procedure'
    | 'prescriptions'
    | 'instruction'
    | 'notes';

export interface ConsultationState {
    complaints: ConsultationItem[];
    diagnosis: ConsultationItem[];
    examination: ConsultationItem[];
    investigation: ConsultationItem[];
    procedure: ConsultationItem[];
    prescriptions: ConsultationItem[];
    instruction: ConsultationItem[];
    notes: ConsultationItem[];

    // Timer
    sessionStartTime: number;
    elapsedTime: string;
}

/** Section key mapping used by useConsultation hook */
export const SECTION_KEYS: Record<TabType, keyof ConsultationState> = {
    complaints: 'complaints',
    diagnosis: 'diagnosis',
    examination: 'examination',
    investigation: 'investigation',
    procedure: 'procedure',
    prescriptions: 'prescriptions',
    instruction: 'instruction',
    notes: 'notes',
};
