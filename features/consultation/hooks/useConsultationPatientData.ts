import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Asset, Patient } from '@/entities';
import { PatientRepository } from '@/repositories';
import { useSessionStore } from '@/stores/session-store';

function safeFormatTimestamp(rawTimestamp: unknown): string {
    if (rawTimestamp == null) return 'Unknown Date';
    const parsed = typeof rawTimestamp === 'number' ? rawTimestamp : Number(rawTimestamp);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return 'Unknown Date';

    const date = new Date(parsed * 1000);
    if (Number.isNaN(date.getTime())) return 'Unknown Date';

    return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

interface UseConsultationPatientDataParams {
    patientId?: string;
    isPhotosVisible: boolean;
    isLabsVisible: boolean;
}

export function useConsultationPatientData({
    patientId,
    isPhotosVisible,
    isLabsVisible,
}: UseConsultationPatientDataParams) {
    const user = useSessionStore((state) => state.user);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoadingPatient, setIsLoadingPatient] = useState(true);
    const [patientError, setPatientError] = useState<string | null>(null);

    const [patientPhotos, setPatientPhotos] = useState<Asset[]>([]);
    const [patientLabs, setPatientLabs] = useState<Asset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);

    const handleCapturePhoto = useCallback(async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const newImage = result.assets[0];
            const timestamp = Math.floor(Date.now() / 1000);
            const dateStr = safeFormatTimestamp(timestamp);

            const newAsset: Asset = {
                id: `temp-${Date.now()}`,
                url: newImage.uri,
                type: 'image',
                date: dateStr,
                label: 'Captured Photo',
            };

            setPatientPhotos((prev) => [newAsset, ...prev]);
        }
    }, []);

    useEffect(() => {
        if (!patientId) return;
        setIsLoadingPatient(true);
        setPatientError(null);
        let cancelled = false;

        const fetchPatient = async () => {
            try {
                const data = await PatientRepository.getPatientDetails(patientId);
                if (cancelled) return;
                setPatient(data);
            } catch (error) {
                if (cancelled) return;
                if (__DEV__) console.error('Error fetching patient details:', error);
                setPatientError('Failed to load patient details.');
            } finally {
                if (!cancelled) setIsLoadingPatient(false);
            }
        };

        fetchPatient();
        return () => { cancelled = true; };
    }, [patientId]);

    useEffect(() => {
        if (!user || !patientId) return;

        if (isPhotosVisible || isLabsVisible) {
            setIsLoadingAssets(true);

            PatientRepository.getPatientDocuments(patientId)
                .then((response: any) => {
                    let documents: any[] = [];

                    if (response?.appointments && Array.isArray(response.appointments)) {
                        response.appointments.forEach((apt: any) => {
                            if (Array.isArray(apt.medical_history)) {
                                documents.push(...apt.medical_history);
                            }
                        });
                        if (__DEV__) console.log(`[Consultation] Extracted ${documents.length} docs from appointments`);
                    } else if (Array.isArray(response)) {
                        documents = response;
                    } else if (response?.data && Array.isArray(response.data)) {
                        documents = response.data;
                    } else if (response?.medical_history && Array.isArray(response.medical_history)) {
                        documents = response.medical_history;
                    } else {
                        documents = [];
                        if (__DEV__) {
                            console.log(`Unsure how to parse documents response: ${JSON.stringify(response).substring(0, 200)}...`);
                        }
                    }

                    const photos: Asset[] = [];
                    const labs: Asset[] = [];

                    documents.forEach((doc: any, idx: number) => {
                        const rawFileName = doc.file_name || '';
                        const recordLink = doc.record_link || doc.link || doc.url;
                        const createdTs = doc.created_timestamp || doc.created_at;
                        if (!recordLink) return;

                        const fileName = rawFileName.toLowerCase();
                        const isImage = fileName.endsWith('.jpg') ||
                            fileName.endsWith('.jpeg') ||
                            fileName.endsWith('.png') ||
                            fileName.endsWith('.webp');
                        const isPdf = fileName.endsWith('.pdf');

                        const asset: Asset = {
                            id: doc._id || doc.id || `doc-${idx}`,
                            url: recordLink,
                            type: isImage ? 'image' : 'pdf',
                            date: safeFormatTimestamp(createdTs),
                            label: rawFileName || 'Document',
                        };

                        if (isImage) {
                            photos.push(asset);
                        } else if (isPdf) {
                            labs.push(asset);
                        } else if (recordLink.match(/\.(jpeg|jpg|png|webp)$/i)) {
                            photos.push(asset);
                        } else {
                            labs.push(asset);
                        }
                    });

                    setPatientPhotos(photos);
                    setPatientLabs(labs);
                })
                .catch((err) => {
                    console.error('Error fetching patient documents:', err);
                    Alert.alert('Error', 'Failed to load documents');
                })
                .finally(() => {
                    setIsLoadingAssets(false);
                });
        }
    }, [isLabsVisible, isPhotosVisible, patientId, user]);

    return {
        patient,
        setPatient,
        isLoadingPatient,
        patientError,
        user,
        patientPhotos,
        patientLabs,
        isLoadingAssets,
        handleCapturePhoto,
    };
}
