import type { PdfFilterRenderOptions } from '@/components/consultation/pdf-filter-modal';
import type { ConsultationItem } from '@/entities';
import type { TabType } from '@/hooks/useConsultation';
import type { PdfSection } from '@/services/pdf-service';

export const DEFAULT_PDF_SECTION_IDS = [
    'complaints',
    'diagnosis',
    'examination',
    'investigation',
    'procedure',
    'prescriptions',
    'instruction',
    'notes',
];

export const DEFAULT_PDF_RENDER_OPTIONS: PdfFilterRenderOptions = {
    includePatientDetails: true,
    includeDoctorDetails: true,
    includeHeaderSection: true,
    includeFooterSection: true,
};

export const SECTION_LABELS: Record<TabType, string> = {
    complaints: 'Complaints',
    diagnosis: 'Diagnosis',
    examination: 'Examination',
    investigation: 'Investigation',
    procedure: 'Procedure',
    prescriptions: 'Prescriptions',
    instruction: 'Instruction',
    notes: 'Notes',
};

export const SECTION_SETTINGS_KEYS: { id: string; key: string }[] = [
    { id: 'complaints', key: 'complaints' },
    { id: 'diagnosis', key: 'diagnosis' },
    { id: 'examination', key: 'examination' },
    { id: 'investigation', key: 'investigation' },
    { id: 'procedure', key: 'procedure' },
    { id: 'prescriptions', key: 'prescriptions' },
    { id: 'instruction', key: 'instruction' },
    { id: 'notes', key: 'notes' },
];

interface PdfSectionItemsInput {
    complaints: ConsultationItem[];
    diagnoses: ConsultationItem[];
    examinations: ConsultationItem[];
    investigations: ConsultationItem[];
    procedures: ConsultationItem[];
    prescriptions: ConsultationItem[];
    instructions: ConsultationItem[];
    notes: ConsultationItem[];
}

export function firstParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

export function createDefaultPdfSectionVisibility(): Record<string, boolean> {
    return DEFAULT_PDF_SECTION_IDS.reduce(
        (acc, id) => ({ ...acc, [id]: true }),
        {} as Record<string, boolean>
    );
}

export function buildAllPdfSections(items: PdfSectionItemsInput): PdfSection[] {
    return [
        { id: 'complaints', title: 'Complaints', items: items.complaints },
        { id: 'diagnosis', title: 'Diagnosis', items: items.diagnoses },
        { id: 'examination', title: 'Examination', items: items.examinations },
        { id: 'investigation', title: 'Investigation', items: items.investigations },
        { id: 'procedure', title: 'Procedures', items: items.procedures },
        {
            id: 'prescriptions',
            title: 'Prescriptions',
            items: items.prescriptions.map((item) => ({ ...item, isPrescription: true })),
        },
        { id: 'instruction', title: 'Instructions', items: items.instructions },
        { id: 'notes', title: 'Notes', items: items.notes },
    ].filter((section) => section.items.length > 0) as PdfSection[];
}
