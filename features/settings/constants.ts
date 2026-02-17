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
    { id: 's1', label: 'Complaints' },
    { id: 's2', label: 'Diagnosis' },
    { id: 's3', label: 'Prescriptions' },
    { id: 's4', label: 'Instruction' },
    { id: 's5', label: 'Procedure' },
    { id: 's6', label: 'Investigation' },
    { id: 's7', label: 'Examination' },
    { id: 's8', label: 'Notes' },
];

export const CONSULTATION_SETTINGS_DATA = [
    { id: 'doctorDetails', label: 'Doctor Details Section', default: true },
    { id: 'patientDetails', label: 'Patient Details Section', default: true },
    { id: 'headerSection', label: 'Header Section', default: true },
    { id: 'footerSection', label: 'Footer Section', default: true },
    { id: 'complaintsSection', label: 'Complaints Section', default: false },
    { id: 'diagnosisSection', label: 'Diagnosis Section', default: true },
    { id: 'examinationsSection', label: 'Examinations Section', default: true },
    { id: 'investigationsSection', label: 'Investigations Section', default: true },
    { id: 'proceduresSection', label: 'Procedures Section', default: true },
    { id: 'instructionsSection', label: 'Instructions Section', default: true },
    { id: 'notesSection', label: 'Notes Section', default: true },
    { id: 'prescriptionsSections', label: 'Prescriptions Sections', default: true },
    { id: 'numbersForPrescriptions', label: 'Numbers for Prescriptions', default: true },
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
