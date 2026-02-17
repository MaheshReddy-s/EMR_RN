import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/endpoints';
import type { Patient, VisitHistory } from '@/entities';
import { fetchAndDecryptFile } from '@/shared';

export function usePatientPdf(patient: Patient | null) {
    const getPdfPath = useCallback((visit: VisitHistory): string => {
        if (visit.name) {
            return API_ENDPOINTS.CONSULTATION.PDF_DOWNLOAD(visit.name);
        }
        if (visit.link) {
            return visit.link.startsWith('/') ? visit.link : `/${visit.link}`;
        }
        return '';
    }, []);

    const tryFetchAndDecrypt = useCallback(async (visit: VisitHistory) => {
        const pdfPath = getPdfPath(visit);
        if (!pdfPath) return null;
        const fullUrl = `${API_BASE_URL}${pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`}`;
        return fetchAndDecryptFile(fullUrl);
    }, [getPdfPath]);

    const handleViewPDF = useCallback(async (visit: VisitHistory) => {
        const pdfPath = getPdfPath(visit);
        if (!pdfPath) {
            Alert.alert('Error', 'No PDF available for this visit.');
            return;
        }

        try {
            const result = await tryFetchAndDecrypt(visit);
            if (!result) return;

            if (Platform.OS === 'web' && result.blob) {
                const blobUrl = URL.createObjectURL(result.blob);
                window.open(blobUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            } else {
                const { Paths, File } = require('expo-file-system');

                const fileName = `Report_${visit.date.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
                const file = new File(Paths.cache, fileName);

                file.write(result.bytes);

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(file.uri, {
                        mimeType: result.mimeType || 'application/pdf',
                        dialogTitle: `Medical Report - ${patient?.patient_name}`,
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert('Error', 'Sharing is not available on this device');
                }
            }
        } catch (error: any) {
            if (__DEV__) console.error('Error viewing PDF:', error);
            Alert.alert('Error', error.message || 'Could not open the PDF. Please try again.');
        }
    }, [getPdfPath, patient?.patient_name, tryFetchAndDecrypt]);

    const handlePrintPDF = useCallback(async (visit: VisitHistory) => {
        try {
            const result = await tryFetchAndDecrypt(visit);
            if (!result) return;

            if (Platform.OS === 'web' && result.blob) {
                const blobUrl = URL.createObjectURL(result.blob);
                const printWindow = window.open(blobUrl, '_blank');
                if (printWindow) {
                    printWindow.addEventListener('load', () => {
                        printWindow.print();
                    });
                }
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            } else {
                const { Paths, File } = require('expo-file-system');
                const fileName = `Print_${visit.date.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
                const file = new File(Paths.cache, fileName);

                file.write(result.bytes);

                await Print.printAsync({
                    uri: file.uri,
                });
            }
        } catch (error: any) {
            if (error.message?.includes('Printing did not complete') || error.message?.includes('cancelled')) {
                return;
            }
            if (__DEV__) console.error('Error printing PDF:', error);
            Alert.alert('Print Failed', error.message || 'Could not print the report. Please try again.');
        }
    }, [tryFetchAndDecrypt]);

    const handleSharePDF = useCallback(async (visit: VisitHistory) => {
        try {
            const result = await tryFetchAndDecrypt(visit);
            if (!result) return;

            if (Platform.OS === 'web' && result.blob) {
                const blobUrl = URL.createObjectURL(result.blob);
                window.open(blobUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            } else {
                const { Paths, File } = require('expo-file-system');
                const fileName = `Share_${visit.date.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
                const file = new File(Paths.cache, fileName);

                file.write(result.bytes);

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(file.uri, {
                        mimeType: result.mimeType || 'application/pdf',
                        dialogTitle: `Medical Report - ${patient?.patient_name}`,
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert('Error', 'Sharing is not available on this device');
                }
            }
        } catch (error: any) {
            if (__DEV__) console.error('Error sharing PDF:', error);
            Alert.alert('Share Failed', error.message || 'Could not share the report. Please try again.');
        }
    }, [patient?.patient_name, tryFetchAndDecrypt]);

    return {
        handleViewPDF,
        handlePrintPDF,
        handleSharePDF,
    };
}
