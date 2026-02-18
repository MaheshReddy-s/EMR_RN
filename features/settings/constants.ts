import type { MasterDataCategory } from '@/repositories';
import type { ListItem, SettingSection } from '@/features/settings/types';

export const SECTION_MAPPING: Record<string, MasterDataCategory> = {
    Complaints: 'complaints',
    Examination: 'examination',
    Diagnosis: 'diagnosis',
    Prescriptions: 'prescription',
    Investigation: 'investigation',
    Procedure: 'procedure',
    Instruction: 'instruction',
    Notes: 'notes',
};

export const INITIAL_SECTIONS_ORDER: ListItem[] = [
    { id: 's1', label: 'Complaints', key: 'complaints', enabled: true },
    { id: 's2', label: 'Diagnosis', key: 'diagnosis', enabled: true },
    { id: 's3', label: 'Prescriptions', key: 'prescriptions', enabled: true },
    { id: 's4', label: 'Instruction', key: 'instruction', enabled: true },
    { id: 's5', label: 'Procedure', key: 'procedure', enabled: true },
    { id: 's6', label: 'Investigation', key: 'investigation', enabled: true },
    { id: 's7', label: 'Examination', key: 'examination', enabled: true },
    { id: 's8', label: 'Notes', key: 'notes', enabled: true },
    { id: 's9', label: 'Vitals', key: 'vitals', enabled: true },
];

export const CONSULTATION_SETTINGS_DATA = [
    { id: 'doctor_details_in_consultation', label: 'Doctor Details Section', default: true },
    { id: 'patient_details_in_consultation', label: 'Patient Details Section', default: true },
    { id: 'letterpad_header', label: 'Header Section', default: true },
    { id: 'letterpad_footer', label: 'Footer Section', default: true },
    { id: 'complaints', label: 'Complaints Section', default: false },
    { id: 'diagnosis', label: 'Diagnosis Section', default: true },
    { id: 'examination', label: 'Examinations Section', default: true },
    { id: 'investigation', label: 'Investigations Section', default: true },
    { id: 'procedure', label: 'Procedures Section', default: true },
    { id: 'instruction', label: 'Instructions Section', default: true },
    { id: 'notes', label: 'Notes Section', default: true },
    { id: 'prescriptions', label: 'Prescriptions Sections', default: true },
    { id: 'numbers_for_prescriptions', label: 'Numbers for Prescriptions', default: true },
] as const;

export const SIDEBAR_ITEMS: Array<{ section: SettingSection; label: string }> = [
    { section: 'Complaints', label: 'Complaints' },
    { section: 'Examination', label: 'Examination' },
    { section: 'Diagnosis', label: 'Diagnosis' },
    { section: 'Prescriptions', label: 'Prescriptions' },
    { section: 'Investigation', label: 'Investigation' },
    { section: 'Procedure', label: 'Procedure' },
    { section: 'Instruction', label: 'Instruction' },
    { section: 'Notes', label: 'Notes' },
    { section: 'Sections', label: 'Sections' },
    { section: 'Advanced Settings', label: 'Advanced Settings' },
    { section: 'Consultation Settings', label: 'Consultation Settings' },
];

export const LIST_SECTIONS: SettingSection[] = [
    'Complaints',
    'Examination',
    'Diagnosis',
    'Prescriptions',
    'Investigation',
    'Procedure',
    'Instruction',
    'Notes',
];
