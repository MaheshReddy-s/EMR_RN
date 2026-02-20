import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { EditProfileModal } from '@/components/patient/EditProfileModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ConsultationScreenContent } from '@/features/consultation/components/ConsultationScreenContent';
import { useConsultationScreenController } from '@/features/consultation/hooks/useConsultationScreenController';
import {
    firstParam,
} from '@/features/consultation/utils/consultation-screen-utils';

export default function ConsultationScreen() {
    const params = useLocalSearchParams<{
        patientId: string;
        appointmentId?: string;
        aptTimestamp?: string;
    }>();
    const patientId = firstParam(params.patientId) as string;
    const appointmentId = firstParam(params.appointmentId);
    const aptTimestampRaw = firstParam(params.aptTimestamp);
    const appointmentTimestamp = aptTimestampRaw ? Number(aptTimestampRaw) : null;
    const {
        contentProps,
        patient,
        setPatient,
        isEditProfileVisible,
        setIsEditProfileVisible,
    } = useConsultationScreenController({
        patientId,
        appointmentId,
        appointmentTimestamp,
    });

    return (
        <ErrorBoundary>
            <ConsultationScreenContent {...contentProps} />
            <EditProfileModal
                visible={isEditProfileVisible}
                onClose={() => setIsEditProfileVisible(false)}
                patient={patient}
                onSave={(updated) => setPatient(updated)}
            />
        </ErrorBoundary>
    );
}
