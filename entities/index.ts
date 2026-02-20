/**
 * Entities barrel export
 * ──────────────────────
 * Centralized re-export of all domain entity types.
 * Import from here for convenience:
 *   import { Patient, ConsultationItem, Appointment } from '@/entities';
 */

// User / Auth
export type { User, ClinicDetails, LoginResponse } from './user/types';

// Patient
export type {
    Patient,
    PatientUIModel,
    RegisterPatientPayload,
    VisitHistory,
    Asset,
} from './patient/types';
export type { NormalizedPatients } from './patient/normalization';
export {
    createEmptyNormalizedPatients,
    normalizePatients,
    mergeNormalizedPatients,
    denormalizePatients,
} from './patient/normalization';

// Consultation
export type {
    StrokeData,
    PrescriptionVariant,
    PrescriptionData,
    PrescriptionPayload,
    ConsultationItem,
    ConsultationItemPayload,
    ConsultationRecord,
    SuggestionItem,
    TabType,
    ConsultationState,
} from './consultation/types';

export { CONSULTATION_SECTION_KEYS, SECTION_KEYS } from './consultation/types';

// Appointment
export type {
    Appointment,
    AppointmentUIModel,
    CreateAppointmentPayload,
} from './appointment/types';
