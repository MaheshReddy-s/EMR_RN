export type SettingSection =
    | 'Complaints'
    | 'Examination'
    | 'Diagnosis'
    | 'Prescriptions'
    | 'Investigation'
    | 'Procedure'
    | 'Instruction'
    | 'Notes'
    | 'Sections'
    | 'Advanced Settings'
    | 'Consultation Settings';

export interface ListItem {
    id: string;
    label: string;
    key: string;
    enabled: boolean;
}

export interface AdvancedSettings {
    pencil_thickness: number;
    top_space: number;
    bottom_space: number;
    left_space: number;
    right_space: number;
    followup_window: number;
    slot_duration: number;
    doctor_details_in_consultation: boolean;
    patient_details_in_consultation: boolean;
    letterpad_header: boolean;
    letterpad_footer: boolean;
    complaints: boolean;
    diagnosis: boolean;
    examination: boolean;
    investigation: boolean;
    procedure: boolean;
    instruction: boolean;
    notes: boolean;
    prescriptions: boolean;
    numbers_for_prescriptions: boolean;
}
