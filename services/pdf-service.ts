import { StrokeData } from '@/components/consultation/drawing-canvas';
import { User } from '@/services/auth-service';
import { Patient } from '@/services/patient-service';
import { Platform } from 'react-native';

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
    generateHtml(data: PdfData): string {
        return buildHtml(data);
    },

    /**
     * Generate a PDF from consultation data.
     * Returns the URI of the generated file (native) or null (web).
     */
    async createPdf(data: PdfData): Promise<string | null> {
        const htmlContent = buildHtml(data);

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
};

function renderStrokesToSvg(strokes: StrokeData[] | undefined, height: number = 60): string {
    if (!strokes || strokes.length === 0) return '';

    // Fixed width of 720 matches the POC specification and container width
    const paths = strokes.map(stroke => {
        const d = stroke.svg;
        const color = stroke.color || '#000000';
        const width = stroke.width || 1.5;
        const blend = stroke.blendMode === 'Clear' ? 'destination-out' : 'source-over';

        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" style="mix-blend-mode: ${blend}" />`;
    }).join('');

    return `
        <svg viewBox="0 0 720 ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            ${paths}
        </svg>
    `;
}

function buildHtml(data: PdfData): string {
    const { patient, doctor, sections, date, followUpDate } = data;

    const sectionsHtml = sections
        .filter((s) => s.items.length > 0)
        .map((section) => {
            const isPrescriptions = section.id === 'prescriptions';
            // User screenshot shows "Instruction" singular for some sections
            const displayTitle = section.title === 'Instructions' ? 'Instruction' : section.title;

            const rowsHtml = section.items.map((item, idx) => {
                const rowHeight = item.height || 47;
                const dosage = item.dosage || '';
                const duration = item.duration || '';

                return `
                <div class="prescription-row" style="height: ${rowHeight}px;">
                    <div class="text-layer">
                        <div class="text-base number">${idx + 1}.</div>
                        <div class="text-base name ${!isPrescriptions ? 'name-full' : ''}">${escapeHtml(item.name)}</div>
                        ${isPrescriptions ? `
                            <div class="text-base dosage">${escapeHtml(dosage)}</div>
                            <div class="text-base duration">${escapeHtml(duration)}</div>
                        ` : ''}
                    </div>
                    <div class="canvas-overlay">
                        ${renderStrokesToSvg(item.drawings, rowHeight)}
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
                padding: 10px 20px;
                margin-bottom: 25px;
            }
            .clinic-row { display: flex; align-items: center; margin-bottom: 12px; }
            .clinic-logo { width: 65px; height: 65px; margin-right: 18px; object-fit: contain; }
            .clinic-details { display: flex; flex-direction: column; }
            .clinic-name { font-size: 20px; font-weight: 700; color: #111; }
            .clinic-address { font-size: 13.5px; color: #8a8a8a; }

            .doctor-details { margin-bottom: 20px; font-size: 13.5px; }
            .doc-line { font-weight: 700; margin-bottom: 2px; }

            .patient-grid {
                display: grid;
                grid-template-columns: 1.3fr 1.2fr 0.5fr;
                gap: 15px;
                font-size: 13px;
                margin-top: 15px;
                border-top: 1px solid #eee;
                padding-top: 10px;
            }
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
            
            .prescription-row { 
                position: relative;
                width: 720px;
                border-bottom: 1px solid #f2f2f2; 
                page-break-inside: avoid;
                overflow: hidden;
            }

            .text-layer {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 5;
                pointer-events: none;
            }
            .text-base {
                position: absolute;
                top: 1px;
                font-size: 13.5px;
                font-weight: 700;
                color: #000;
                white-space: nowrap;
            }

            /* EXACT OFFSETS FROM PrescriptionRowLayout.tsx */
            .number { left: 10px; width: 25px; color: #666; font-weight: 600; }
            .name { left: 28px; }
            .name-full { left: 28px; width: 680px; font-weight: 400; font-size: 13px; white-space: normal; }
            .dosage { left: 316px; width: 230px; }
            .duration { left: 554px; width: 160px; text-align: right; }

            .canvas-overlay { 
                position: absolute; 
                top: 0; left: 0; bottom: 0; width: 720px;
                z-index: 10;
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
            .sig-name { font-weight: 700; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="clinic-row">
                ${clinicLogo ? `<img src="${clinicLogo}" class="clinic-logo" />` : ''}
                <div class="clinic-details">
                    <span class="clinic-name">${clinicName}</span>
                    <span class="clinic-address">${clinicAddress}</span>
                </div>
            </div>

            <div class="doctor-details">
                <div class="doc-line">${doctorFullName} ${qualifications}</div>
                <div class="doc-line">${designation}</div>
                <div class="doc-line">Registration No : ${regNo}</div>
            </div>

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
        </div>

        <main>
            ${sectionsHtml}
        </main>

        <footer class="footer">
            <div class="date-area">
                Date: ${date}
            </div>
            <div class="sig-area">
                <div class="sig-placeholder"></div>
                <div class="sig-name">${doctorFullName} ${qualifications}</div>
            </div>
        </footer>
    </body>
    </html>
    `;
}
