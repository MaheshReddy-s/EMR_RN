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
}
