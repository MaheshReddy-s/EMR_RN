import { APPOINTMENT_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import { PatientRepository } from '@/repositories';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Patient {
    id: string;
    name: string;
    mobile: string;
    age?: number;
    gender?: string;
    email?: string;
}

interface NewAppointmentModalProps {
    visible: boolean;
    onClose: () => void;
    onCreateAppointment: (patient: Patient, type: string) => void;
    onRegisterNew: (data: { name: string; mobile: string }) => void;
}

const CONSULTATION_TYPES = [
    { id: 'walkin', label: 'Consultation' },
    { id: 'follow-up', label: 'Follow Up' },
    { id: 'procedure', label: 'Procedure' },
];

export default function NewAppointmentModal({
    visible,
    onClose,
    onCreateAppointment,
    onRegisterNew,
}: NewAppointmentModalProps) {
    const [step, setStep] = useState(0); // 0: Search, 1: Type Selection
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedTypeId, setSelectedTypeId] = useState<string>('walkin');
    const [mobileSearch, setMobileSearch] = useState('');
    const [nameSearch, setNameSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isWeb = Platform.OS === 'web';

    // Issue #8: Clean up debounce timer on unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
                searchTimerRef.current = null;
            }
        };
    }, []);

    const performSearch = (text: string) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!text.trim()) {
            setSearchResults([]);
            return;
        }

        searchTimerRef.current = setTimeout(async () => {
            
            setIsSearching(true);
            try {
                // Search via API only — matching Swift MSPatientDataProvider.searchPatient
                const results = await PatientRepository.searchPatients(text, 0);
                setSearchResults(results.map(p => ({
                    id: p._id,
                    name: p.patient_name,
                    mobile: p.patient_mobile,
                    age: typeof p.age === 'number' ? p.age : undefined,
                    gender: p.gender,
                    email: p.email,
                })));
            } catch (e) {
                if (__DEV__) console.log('Search info:', e);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const handleMobileChange = (text: string) => {
        // Swift limit: 10 chars
        if (text.length > 10) return;
        setMobileSearch(text);
        setNameSearch(''); // Clear other field to avoid confusion, matching Swift behavior
        performSearch(text);
    };

    const handleNameChange = (text: string) => {
        setNameSearch(text);
        setMobileSearch(''); // Clear other field to avoid confusion
        performSearch(text);
    };

    const handlePatientSelect = (patient: Patient) => {
        setSelectedPatient(patient);
        setStep(1);
    };

    const handleCreateClick = () => {
        if (selectedPatient) {
            onCreateAppointment(selectedPatient, selectedTypeId);
            handleClose();
        }
    };

    const handleCreateNewPatient = () => {
        onRegisterNew({ name: nameSearch, mobile: mobileSearch });
        handleClose();
    };

    const handleClose = () => {
        setMobileSearch('');
        setNameSearch('');
        setSearchResults([]);
        setSelectedPatient(null);
        setSelectedTypeId('walkin');
        setStep(0);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/50 justify-center items-center p-4">
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        overflow: 'hidden',
                        width: isWeb ? 480 : '90%',
                        maxWidth: 600,
                        minHeight: step === 0 ? 450 : 380,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5,
                    }}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-5 pb-4">
                        <View className="flex-row items-center">
                            <Text className="text-xl font-bold text-gray-800">
                                {step === 0 ? 'Start Consultation' : 'Consultation Type'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Icon icon={APPOINTMENT_ICONS.closeCircle} size={32} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Separator line after header */}
                    <View className="h-[1px] bg-gray-100 mx-5 mb-4" />

                    {step === 0 ? (
                        /* Step 0: Search View */
                        <View className="flex-1 px-5 pb-6">
                            {/* Search Fields Row */}
                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1">
                                    <Text className="text-[15px] text-gray-400 font-medium mb-2">Mobile Number</Text>
                                    <TextInput
                                        style={{ height: 44 }}
                                        className="border border-gray-200 rounded-lg px-3 text-base text-gray-700 bg-white"
                                        placeholder=""
                                        keyboardType="phone-pad"
                                        value={mobileSearch}
                                        onChangeText={handleMobileChange}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[15px] text-gray-400 font-medium mb-2">Patient Name</Text>
                                    <TextInput
                                        style={{ height: 44 }}
                                        className="border border-gray-200 rounded-lg px-3 text-base text-gray-700 bg-white"
                                        placeholder=""
                                        value={nameSearch}
                                        onChangeText={handleNameChange}
                                    />
                                </View>
                            </View>

                            {/* Search Results List */}
                            <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
                                {isSearching ? (
                                    <View className="py-10 items-center">
                                        <ActivityIndicator color="#007AFF" />
                                    </View>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((patient, index) => (
                                        <TouchableOpacity
                                            key={patient.id}
                                            onPress={() => handlePatientSelect(patient)}
                                            className={`py-4 ${index !== searchResults.length - 1 ? 'border-b border-gray-100' : ''}`}
                                        >
                                            <Text className="text-lg font-bold text-gray-700 mb-0.5">
                                                {patient.name}
                                            </Text>
                                            <Text className="text-sm text-gray-400 font-medium">
                                                {patient.mobile}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (mobileSearch || nameSearch) && !isSearching ? (
                                    <View className="py-10 items-center">
                                        <Text className="text-gray-400">No patients found</Text>
                                    </View>
                                ) : null}
                            </ScrollView>

                            {/* Create Button */}
                            <TouchableOpacity
                                onPress={handleCreateNewPatient}
                                className="bg-[#007AFF] py-4 rounded-lg mt-auto"
                                style={{ height: 54, justifyContent: 'center' }}
                            >
                                <Text className="text-white text-center font-bold text-lg">
                                    Create
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Step 1: Consultation Type Selection - Matching Screenshot */
                        <View className="flex-1 px-5 pb-6">
                            <View className="flex-1">
                                {CONSULTATION_TYPES.map((type, index) => (
                                    <TouchableOpacity
                                        key={type.id}
                                        onPress={() => setSelectedTypeId(type.id)}
                                        className={`py-5 ${index !== CONSULTATION_TYPES.length - 1 ? 'border-b border-gray-100' : ''} flex-row items-center justify-between`}
                                        activeOpacity={0.6}
                                    >
                                        <Text className={`text-lg ${selectedTypeId === type.id ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                            {type.label}
                                        </Text>
                                        {selectedTypeId === type.id && (
                                            <Icon icon={APPOINTMENT_ICONS.checkmarkCircle} size={24} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={handleCreateClick}
                                className="bg-[#007AFF] py-4 rounded-xl mt-6"
                                style={{ height: 54, justifyContent: 'center' }}
                            >
                                <Text className="text-white text-center font-bold text-lg">
                                    Create
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
