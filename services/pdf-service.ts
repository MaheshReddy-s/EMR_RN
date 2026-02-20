import { StrokeData } from '@/components/consultation/drawing-canvas';
import {
    API_REFERENCE_WIDTH,
    FIXED_CONTENT_WIDTH,
    NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT,
    NON_PRESCRIPTION_HORIZONTAL_PADDING,
    NON_PRESCRIPTION_NAME_LINE_HEIGHT,
    NON_PRESCRIPTION_NOTES_DEFAULT_ROW_HEIGHT,
    NON_PRESCRIPTION_NOTES_LINE_HEIGHT,
    NON_PRESCRIPTION_VERTICAL_PADDING,
    PRESCRIPTION_DEFAULT_ROW_HEIGHT,
    PRESCRIPTION_ROW_1_HEIGHT,
    PRESCRIPTION_ROW_2_HEIGHT,
    PRESCRIPTION_ROW_2_MARGIN_TOP,
    PRESCRIPTION_WITH_ROW_2_DEFAULT_ROW_HEIGHT
} from '@/components/consultation/prescription-row-layout';
import { User, Patient } from '@/entities';
import { Platform } from 'react-native';
import { File as FSFile, Paths } from 'expo-file-system';
import { AuthRepository } from '@/repositories';
import { getDecryptedMasterKey, encryptAesGcm } from '@/shared/lib/crypto-service';

/**
 * PdfService
 * ----------
 * Cross-platform PDF generation for Medical consultations.
 * - Uses SVG to accurately render stylus drawings.
 * - Generates high-fidelity PDF via expo-print.
 */

export interface PdfSectionItem {
    name: string;
    dosage?: string;
    duration?: string;
    notes?: string;
    instructions?: string;
    timings?: string;
    drawings?: StrokeData[];
    height?: number;
    isPrescription?: boolean;
}

export interface PdfSection {
    id: string;
    title: string;
    items: PdfSectionItem[];
}

interface PdfData {
    patient: Patient;
    doctor: User;
    sections: PdfSection[];
    followUpDate?: string;
    date: string;
}

export interface PdfRenderOptions {
    includeHeaderFooter?: boolean; // backward compatibility
    includeHeaderSection?: boolean;
    includeFooterSection?: boolean;
    includeDoctorDetails?: boolean;
    includePatientDetails?: boolean;
}

/**
 * Escape HTML special characters to prevent XSS in generated PDFs.
 */
function escapeHtml(str: string | undefined | null): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Derive honorific prefix from patient gender.
 */
function getGenderPrefix(gender: string | undefined | null): string {
    if (!gender) return '';
    const g = gender.toLowerCase();
    if (g === 'female') return 'Ms. ';
    if (g === 'male') return 'Mr. ';
    return '';
}

export const PdfService = {
    /**
     * Generate HTML content for the PDF.
     * Exported so it can be used for Live Preview in a WebView.
     */
    generateHtml(data: PdfData, options?: PdfRenderOptions): string {
        return buildHtml(data, options);
    },

    /**
     * Generate a PDF from consultation data.
     * Returns the URI of the generated file (native) or null (web).
     */
    async createPdf(data: PdfData, options?: PdfRenderOptions): Promise<string | null> {
        const htmlContent = buildHtml(data, options);

        if (Platform.OS === 'web') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                // We don't return a URI for web, it just triggers print
                setTimeout(() => printWindow.print(), 500);
            }
            return null;
        }

        try {
            const Print = require('expo-print');
            const result = await Print.printToFileAsync({
                html: htmlContent,
                base64: false
            });
            return result.uri;
        } catch (e) {
            if (__DEV__) console.error('[PdfService] Failed to generate PDF:', e);
            return null;
        }
    },

    /**
     * Share a generated PDF file.
     */
    async sharePdf(uri: string): Promise<void> {
        if (Platform.OS === 'web') {
            window.open(uri, '_blank');
            return;
        }

        try {
            const Sharing = require('expo-sharing');
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            }
        } catch (e) {
            if (__DEV__) console.error('[PdfService] Share failed:', e);
        }
    },

    /**
     * Generate, encrypt and save a PDF file.
     * Returns the URI of the ENCRYPTED file.
     */
    async createEncryptedPdf(data: PdfData, options?: PdfRenderOptions): Promise<string | null> {
        if (Platform.OS === 'web') return null; // Web print doesn't use encryption path

        try {
            // 1. Generate local PDF
            const rawUri = await this.createPdf(data, options);
            if (!rawUri) return null;

            // 2. Read PDF bytes
            const pdfFile = new FSFile(rawUri);
            const bytesRaw = await pdfFile.bytes();

            // 3. Get encryption key
            const encryptedKey = await AuthRepository.getFileEncryptionKey();
            if (!encryptedKey) throw new Error('Missing encryption key');

            const masterKeyBytes = await getDecryptedMasterKey(encryptedKey);

            // 4. Encrypt with AES-GCM
            const encryptedBytes = await encryptAesGcm(bytesRaw, masterKeyBytes);

            // 5. Save encrypted binary to temp file
            const encryptedFileName = `encrypted_consultation_${Date.now()}.pdf`;
            const encryptedFile = new FSFile(Paths.cache, encryptedFileName);
            await encryptedFile.write(encryptedBytes);

            const encryptedUri = encryptedFile.uri;

            // Clean up raw PDF
            try { await pdfFile.delete(); } catch (err) { }

            return encryptedUri;
        } catch (error) {
            if (__DEV__) console.error('[PdfService] Encryption failed:', error);
            return null;
        }
    },
};

// Use API_REFERENCE_WIDTH (820) for the viewBox to match DrawingCanvas logical space
function renderStrokesToSvg(strokes: StrokeData[] | undefined, height: number = 70): string {
    if (!strokes || strokes.length === 0) return '';

    // Calculate logical height based on aspect ratio (820 / 720)
    // This ensures physical 1px = logical constant units
    const logicalHeight = height * (API_REFERENCE_WIDTH / FIXED_CONTENT_WIDTH);

    const paths = strokes.map(stroke => {
        const d = stroke.svg;
        const color = stroke.color || '#000000';
        const width = stroke.width || 1.5;
        const blend = stroke.blendMode === 'clear' ? 'destination-out' : 'source-over';

        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" style="mix-blend-mode: ${blend}" />`;
    }).join('');

    return `
        <svg viewBox="0 0 ${API_REFERENCE_WIDTH} ${logicalHeight}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            ${paths}
        </svg>
    `;
}

function toPositiveHeight(height: unknown): number {
    if (typeof height === 'number' && Number.isFinite(height) && height > 0) return height;
    if (typeof height === 'string') {
        const parsed = Number(height);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 0;
}

function normalizeDurationForDisplay(duration: string | undefined): string {
    const trimmed = (duration || '').trim();
    if (!trimmed) return '';
    return /^\d+$/.test(trimmed) ? `${trimmed} Days` : trimmed;
}

function buildHtml(data: PdfData, options?: PdfRenderOptions): string {
    const { patient, doctor, sections, date, followUpDate } = data;
    const includeHeaderSection = options?.includeHeaderSection ?? (options?.includeHeaderFooter !== false);
    const includeFooterSection = options?.includeFooterSection ?? (options?.includeHeaderFooter !== false);
    const includeDoctorDetails = options?.includeDoctorDetails ?? (options?.includeHeaderFooter !== false);
    const includePatientDetails = options?.includePatientDetails ?? (options?.includeHeaderFooter !== false);

    const sectionsHtml = sections
        .filter((s) => s.items.length > 0)
        .map((section) => {
            const isPrescriptions = section.id === 'prescriptions';
            // User screenshot shows "Instruction" singular for some sections
            const displayTitle = section.title === 'Instructions' ? 'Instruction' : section.title;

            const rowsHtml = section.items.map((item, idx) => {
                const hasDosage = !!(item.dosage && item.dosage !== 'N/A' && !item.dosage.includes('-'));
                const hasInstructions = !!item.instructions;
                const hasRow2 = isPrescriptions && (hasDosage || hasInstructions);

                const calculatedDefaultHeight = isPrescriptions
                    ? (hasRow2 ? PRESCRIPTION_WITH_ROW_2_DEFAULT_ROW_HEIGHT : PRESCRIPTION_DEFAULT_ROW_HEIGHT)
                    : (item.notes ? NON_PRESCRIPTION_NOTES_DEFAULT_ROW_HEIGHT : NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT);

                const apiHeight = toPositiveHeight(item.height);
                // Keep preview row height aligned with consultation row height.
                // Do not auto-expand based on stroke bounds.
                const rowMinHeight = Math.max(calculatedDefaultHeight, apiHeight);

                if (isPrescriptions) {
                    return `
                    <div class="consultation-row row-prescription" style="min-height: ${rowMinHeight}px;">
                        <div class="canvas-overlay">
                            ${renderStrokesToSvg(item.drawings, rowMinHeight)}
                        </div>
                        <div class="text-layer text-layer-prescription">
                            <div class="prescription-row-1">
                                <span class="number">${idx + 1}.</span>
                                <span class="name-prescription">
                                    ${escapeHtml(item.name).toUpperCase()}
                                </span>
                                <div class="timings-center">${escapeHtml(item.timings)}</div>
                                <div class="duration-right">${escapeHtml(normalizeDurationForDisplay(item.duration))}</div>
                            </div>
                            ${hasRow2 ? `
                                <div class="prescription-row-2">
                                    <div class="dosage-sub">${escapeHtml(hasDosage ? item.dosage : '')}</div>
                                    <div class="instructions-sub">${escapeHtml(item.instructions)}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    `;
                }

                return `
                <div class="consultation-row row-generic" style="min-height: ${rowMinHeight}px;">
                    <div class="canvas-overlay">
                        ${renderStrokesToSvg(item.drawings, rowMinHeight)}
                    </div>
                    <div class="text-layer text-layer-generic">
                        <div class="generic-name">${escapeHtml(item.name)}</div>
                        ${item.notes ? `<div class="generic-notes">${escapeHtml(item.notes)}</div>` : ''}
                    </div>
                </div>
                `;
            }).join('');

            return `
            <div class="section-container">
                <div class="section-title"><u>${displayTitle}</u></div>
                <div class="section-content">
                    ${rowsHtml}
                </div>
            </div>
            `;
        })
        .join('');

    const followUpDateText = (followUpDate || '').trim();
    const nextConsultationDateHtml = followUpDateText ? `
            <div class="section-container section-next-consultation">
                <div class="section-title"><u>Next Consultation Date</u></div>
                <div class="next-consultation-row">${escapeHtml(followUpDateText)}</div>
            </div>
            ` : '';

    const clinicName = escapeHtml(doctor.clinic_name || doctor.clinicDetails?.clinic_name || 'Avance');
    const clinicAddress = escapeHtml(doctor.clinicDetails?.address || doctor.address || 'AECS Layout, Kundalahalli, Bengaluru');
    const doctorFullName = escapeHtml(`${doctor.prefix || 'Dr.'} ${doctor.first_name} ${doctor.last_name}`);
    const qualifications = escapeHtml(doctor.qualification || 'MD DVL,MHA(USA)');
    const designation = escapeHtml(doctor.designation || 'Consultant Dermatologist, Cosmotologist Trichologist');
    const regNo = escapeHtml(doctor.registration_no || 'ANP-2007 0000803 KTK');
    const clinicLogo = doctor.clinicDetails?.clinic_logo_url;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 10mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif; 
                margin: 0; 
                padding: 10px 0; 
                color: #000;
                background-color: white;
                line-height: 1;
            }

            /* Header Section */
            .header {
                padding: 10px 20px 0;
                margin-bottom: 12px;
            }
            .clinic-row { display: flex; align-items: center; }
            .clinic-logo { width: 65px; height: 65px; margin-right: 18px; object-fit: contain; }
            .clinic-details { display: flex; flex-direction: column; }
            .clinic-name { font-size: 20px; font-weight: 700; color: #111; }
            .clinic-address { font-size: 13.5px; color: #8a8a8a; }

            .meta-block {
                padding: 0 20px;
                margin-bottom: 25px;
            }
            .doctor-details { margin-bottom: 20px; font-size: 13.5px; }
            .doc-line { font-weight: 700; margin-bottom: 2px; }

            .patient-grid {
                display: grid;
                grid-template-columns: 1.3fr 1.2fr 0.5fr;
                gap: 15px;
                font-size: 13px;
                border-top: 1px solid #eee;
                padding-top: 10px;
            }
            .doctor-details + .patient-grid { margin-top: 15px; }
            .info-label { font-weight: 700; }

            /* Section Styling */
            .section-container { margin-top: 20px; padding: 0 20px; }
            .section-title {
                font-size: 15px;
                font-weight: 800;
                margin-bottom: 8px;
                color: #000;
                text-decoration: underline;
            }
            .next-consultation-row {
                width: ${FIXED_CONTENT_WIDTH}px;
                min-height: ${NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT}px;
                border-bottom: 1px solid #f2f2f2;
                font-size: 14px;
                font-weight: 500;
                color: #212529;
                display: flex;
                align-items: center;
                padding: ${NON_PRESCRIPTION_VERTICAL_PADDING}px ${NON_PRESCRIPTION_HORIZONTAL_PADDING}px;
            }
            
            .consultation-row { 
                position: relative;
                width: ${FIXED_CONTENT_WIDTH}px;
                border-bottom: 1px solid #f2f2f2; 
                page-break-inside: avoid;
                display: block;
                overflow: visible;
            }

            .text-layer {
                z-index: 20;
                pointer-events: none;
                width: 100%;
            }

            .text-layer-prescription {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
            }

            .text-layer-generic {
                position: relative;
                padding-left: ${NON_PRESCRIPTION_HORIZONTAL_PADDING}px;
                padding-right: ${NON_PRESCRIPTION_HORIZONTAL_PADDING}px;
                padding-top: ${NON_PRESCRIPTION_VERTICAL_PADDING}px;
                padding-bottom: ${NON_PRESCRIPTION_VERTICAL_PADDING}px;
            }

            .generic-name {
                min-height: ${NON_PRESCRIPTION_NAME_LINE_HEIGHT}px;
                font-size: 14px;
                font-weight: 400;
                color: #495057;
                line-height: ${NON_PRESCRIPTION_NAME_LINE_HEIGHT}px;
                white-space: pre-wrap;
                word-break: break-word;
            }

            .generic-notes {
                margin-top: 2px;
                font-size: 14px;
                color: #6c757d;
                line-height: ${NON_PRESCRIPTION_NOTES_LINE_HEIGHT}px;
                white-space: pre-wrap;
                word-break: break-word;
            }

            .row-1 { position: relative; width: 100%; }
            .row-2 { position: relative; width: 100%; margin-top: 1px; }
            
            .number { 
                position: absolute; left: 10px; top: 1px;
                width: 25px; font-size: 13.5px; font-weight: 600; color: #666; 
            }
            .prescription-row-1 {
                height: ${PRESCRIPTION_ROW_1_HEIGHT}px;
                position: relative;
                min-height: 22px;
            }
            .prescription-row-2 {
                height: ${PRESCRIPTION_ROW_2_HEIGHT}px;
                position: relative;
                margin-top: ${PRESCRIPTION_ROW_2_MARGIN_TOP}px;
            }
            .name-prescription { 
                position: absolute;
                left: 28px;
                top: 1px;
                width: 235px;
                font-size: 13.5px; font-weight: 700; color: #000; 
                line-height: 1.2;
                text-transform: uppercase;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .timings-center {
                position: absolute; left: 310px; top: 1px;
                width: 240px; font-size: 13.5px; font-weight: 700; color: #495057;
            }

            .duration-right {
                position: absolute; right: 10px; top: 1px;
                font-size: 13.2px; font-weight: 700; color: #000; text-align: right;
            }

            .dosage-sub {
                position: absolute; top: 0px; left: 10px; width: 280px;
                font-size: 13.5px; color: #000;
            }
            .instructions-sub {
                position: absolute; top: 0px; left: 310px; width: 400px;
                font-size: 13.5px; color: #000; font-style: italic;
            }

            .canvas-overlay { 
                position: absolute; 
                top: 0; left: 0; right: 0;
                z-index: 10;
                width: 100%;
                pointer-events: none;
            }

            /* Footer Signature Layout */
            .footer {
                margin: 50px 20px 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            }
            .date-area { font-size: 14px; font-weight: 700; }
            .sig-area { text-align: right; }
            .sig-placeholder { width: 150px; height: 35px; margin-left: auto; }
            .sig-image { height: 75px; max-width: 250px; margin-left: auto; margin-bottom: 5px; object-fit: contain; display: block; }
            .sig-name { font-weight: 700; font-size: 14px; }
        </style>
    </head>
    <body>
        ${includeHeaderSection ? `
        <div class="header">
            <div class="clinic-row">
                ${clinicLogo ? `<img src="${clinicLogo}" class="clinic-logo" />` : ''}
                <div class="clinic-details">
                    <span class="clinic-name">${clinicName}</span>
                    <span class="clinic-address">${clinicAddress}</span>
                </div>
            </div>
        </div>
        ` : ''}

        ${(includeDoctorDetails || includePatientDetails) ? `
        <div class="meta-block">
            ${includeDoctorDetails ? `
            <div class="doctor-details">
                <div class="doc-line">${doctorFullName} ${qualifications}</div>
                <div class="doc-line">${designation}</div>
                <div class="doc-line">Registration No : ${regNo}</div>
            </div>
            ` : ''}

            ${includePatientDetails ? `
            <div class="patient-grid">
                <div>
                    <div class="info-item"><span class="info-label">Patient Name:</span> ${getGenderPrefix(patient.gender)}${escapeHtml(patient.patient_name)}</div>
                    <div class="info-item"><span class="info-label">Gender:</span> ${escapeHtml(patient.gender) || '---'}</div>
                    <div class="info-item"><span class="info-label">Address:</span> ${escapeHtml(patient.locality)}</div>
                </div>
                <div>
                    <div class="info-item"><span class="info-label">Mobile:</span> ${escapeHtml(patient.patient_mobile)}</div>
                    <div class="info-item"><span class="info-label">Blood Group:</span> ${escapeHtml(patient.blood_group)}</div>
                </div>
                <div>
                    <div class="info-item"><span class="info-label">Age:</span> ${escapeHtml(patient.age != null ? String(patient.age) : null) || '---'}</div>
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <main>
            ${sectionsHtml}
            ${nextConsultationDateHtml}
        </main>

        ${includeFooterSection ? `
        <footer class="footer">
            <div class="date-area">
                Date: ${date}
            </div>
            <div class="sig-area">
                ${doctor.signature && typeof doctor.signature === 'string' && doctor.signature.length > 0 ? `
                <img src="${doctor.signature.startsWith('data:') ? doctor.signature : `data:image/png;base64,${doctor.signature}`}" class="sig-image" />
                ` : `
                <div class="sig-placeholder"></div>
                `}
                <div class="sig-name">${doctorFullName} ${qualifications}</div>
            </div>
        </footer>
        ` : ''}
    </body>
    </html>
    `;
}
