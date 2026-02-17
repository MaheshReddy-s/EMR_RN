import { EditProfileModal } from '@/components/patient/EditProfileModal';
import PatientProfileBlock from '@/features/patient-detail/components/PatientProfileBlock';
import PatientScreenHeader from '@/features/patient-detail/components/PatientScreenHeader';
import PatientSummarySection from '@/features/patient-detail/components/PatientSummarySection';
import VisitHistorySection from '@/features/patient-detail/components/VisitHistorySection';
import VisitConsultationDetailsModal from '@/features/patient-detail/components/VisitConsultationDetailsModal';
import { usePatientDetail } from '@/features/patient-detail/hooks/usePatientDetail';
import { usePatientPdf } from '@/features/patient-detail/hooks/usePatientPdf';
import { useVisitConsultationDetails } from '@/features/patient-detail/hooks/useVisitConsultationDetails';
import type { Patient } from '@/entities';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';

function firstParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

export default function PatientSummaryScreen() {
    const params = useLocalSearchParams<{
        id: string;
        patientName?: string;
        patientMobile?: string;
        patientAge?: string;
        patientGender?: string;
    }>();
    const patientId = firstParam(params.id);

    const initialPatient = useMemo<Patient | null>(() => {
        if (!patientId) return null;
        const patientName = firstParam(params.patientName);
        const patientMobile = firstParam(params.patientMobile);
        const patientAge = firstParam(params.patientAge);
        const patientGender = firstParam(params.patientGender);

        if (!patientName || !patientMobile) return null;
        return {
            _id: patientId,
            patient_name: patientName,
            patient_mobile: patientMobile,
            age: patientAge || undefined,
            gender: patientGender || undefined,
        };
    }, [params.patientAge, params.patientGender, params.patientMobile, params.patientName, patientId]);

    const {
        patient,
        history,
        summary,
        isLoading,
        isEditProfileVisible,
        openEditProfile,
        closeEditProfile,
        handlePatientSave,
    } = usePatientDetail(patientId, initialPatient);

    const { handlePrintPDF, handleSharePDF } = usePatientPdf(patient);
    const visitDetails = useVisitConsultationDetails();

    const handleStartConsultation = () => {
        if (!patientId) return;
        router.push({
            pathname: '/(app)/consultation/[patientId]',
            params: { patientId },
        });
    };

    const isWeb = Platform.OS === 'web';

    if (!patient) {
        return (
            <View className="flex-1 bg-white" style={isWeb ? { alignItems: 'center' } : {}}>
                <View style={isWeb ? { width: '100%', maxWidth: 960, flex: 1 } : { flex: 1, width: '100%' }}>
                    <PatientScreenHeader onBack={() => router.back()} />
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#007AFF" />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white" style={isWeb ? { alignItems: 'center' } : {}}>
            <View style={isWeb ? { width: '100%', maxWidth: 960, flex: 1 } : { flex: 1, width: '100%' }}>
                <PatientScreenHeader onBack={() => router.back()} />

                {isLoading ? (
                    <View style={{ position: 'absolute', top: 14, right: 20, zIndex: 10 }}>
                        <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                ) : null}

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <PatientProfileBlock
                        patient={patient}
                        onEditProfile={openEditProfile}
                        onStartConsultation={handleStartConsultation}
                    />
                    <PatientSummarySection summary={summary} />
                    <VisitHistorySection
                        history={history}
                        onOpenVisit={(visit) => { void visitDetails.openVisitDetails(visit); }}
                        onPrintPDF={handlePrintPDF}
                        onSharePDF={handleSharePDF}
                    />
                </ScrollView>
            </View>

            <VisitConsultationDetailsModal
                visible={visitDetails.isVisible}
                patient={patient}
                visit={visitDetails.selectedVisit}
                sections={visitDetails.sections}
                isLoading={visitDetails.isLoading}
                errorMessage={visitDetails.errorMessage}
                onClose={visitDetails.closeVisitDetails}
                onPrintPDF={handlePrintPDF}
                onSharePDF={handleSharePDF}
            />

            <EditProfileModal
                visible={isEditProfileVisible}
                onClose={closeEditProfile}
                patient={patient}
                onSave={handlePatientSave}
            />
        </View>
    );
}
