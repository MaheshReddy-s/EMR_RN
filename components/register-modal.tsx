import { REGISTER_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import { PatientRepository } from '@/repositories';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Patient {
    id: string;
    _id?: string;
    name: string;
    mobile: string;
    age?: number;
    gender?: string;
    email?: string;
}

interface RegisterModalProps {
    visible: boolean;
    onClose: () => void;
    onRegister: (patient: Patient) => void;
    initialData?: { name: string; mobile: string };
}

interface InputRowProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
    maxLength?: number;
}

const InputRow = ({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength }: InputRowProps) => (
    <View className="flex-row items-center mb-5">
        <Text className="w-32 text-gray-500 font-medium text-base">{label}</Text>
        <View className="flex-1">
            <TextInput
                style={{ height: 44 }}
                className="border border-gray-200 rounded-lg px-4 text-base text-gray-700 bg-white"
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                maxLength={maxLength}
            />
        </View>
    </View>
);

export default function RegisterModal({
    visible,
    onClose,
    onRegister,
    initialData,
}: RegisterModalProps) {
    const [patient, setPatient] = useState({
        name: '',
        mobile: '',
        age: '',
        gender: 'Select Gender',
        email: '',
    });
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isWeb = Platform.OS === 'web';

    /**
     * Issue #5: Sync state with initialData via useEffect.
     * This ensures no stale values when the modal is re-opened with different data.
     */
    useEffect(() => {
        if (visible) {
            setPatient({
                name: initialData?.name || '',
                mobile: initialData?.mobile || '',
                age: '',
                gender: 'Select Gender',
                email: '',
            });
            setShowGenderDropdown(false);
            setIsSaving(false);
        }
    }, [visible, initialData?.name, initialData?.mobile]);

    const handleSave = async () => {
        if (!patient.name || !patient.mobile || patient.gender === 'Select Gender') return;

        setIsSaving(true);
        try {
            const registeredPatient = await PatientRepository.registerPatient({
                patient_name: patient.name,
                patient_mobile: patient.mobile,
                age: parseInt(patient.age) || undefined,
                gender: patient.gender,
            });

            const uiPatient: Patient = {
                id: registeredPatient._id,
                _id: registeredPatient._id,
                name: registeredPatient.patient_name,
                mobile: registeredPatient.patient_mobile,
                age: typeof registeredPatient.age === 'number'
                    ? registeredPatient.age
                    : (typeof registeredPatient.age === 'string' ? parseInt(registeredPatient.age) : undefined),
                gender: registeredPatient.gender,
                email: registeredPatient.email,
            };

            onRegister(uiPatient);
            handleClose();
        } catch (e) {
            if (__DEV__) console.error('Registration failed:', e);
            Alert.alert('Registration Failed', 'Could not register patient. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setPatient({ name: '', mobile: '', age: '', gender: 'Select Gender', email: '' });
        setIsSaving(false);
        setShowGenderDropdown(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable className="flex-1 bg-black/50 justify-center items-center p-4" onPress={handleClose}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        overflow: 'hidden',
                        width: isWeb ? 520 : '95%',
                        maxWidth: 600,
                        minHeight: 490,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5,
                    }}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-5 pb-4">
                        <Text className="text-xl font-bold text-gray-800">
                            New Patient Registration
                        </Text>
                        <TouchableOpacity onPress={handleClose} className="p-2">
                            <Icon icon={REGISTER_ICONS.closeCircleOutline} size={32} color="#4A90E2" />
                        </TouchableOpacity>
                    </View>

                    {/* Separator */}
                    <View className="h-[1px] bg-gray-100 mx-5 mb-6" />

                    <ScrollView className="flex-1 px-5 pb-6" showsVerticalScrollIndicator={false}>
                        <InputRow
                            label="Full Name *"
                            value={patient.name}
                            onChangeText={(text: string) => setPatient({ ...patient, name: text })}
                            placeholder="Enter patient name"
                        />

                        <InputRow
                            label="Mobile No *"
                            value={patient.mobile}
                            onChangeText={(text: string) => setPatient({ ...patient, mobile: text })}
                            placeholder="Enter 10-digit number"
                            keyboardType="phone-pad"
                            maxLength={10}
                        />

                        <InputRow
                            label="Age"
                            value={patient.age}
                            onChangeText={(text: string) => setPatient({ ...patient, age: text })}
                            placeholder="Age"
                            keyboardType="number-pad"
                            maxLength={3}
                        />

                        {/* Gender selection row with custom dropdown */}
                        <View className="flex-row items-center mb-5" style={{ zIndex: 10 }}>
                            <Text className="w-32 text-gray-500 font-medium text-base">Gender</Text>
                            <View className="flex-1 relative">
                                <TouchableOpacity
                                    onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                                    style={{ height: 44 }}
                                    className="border border-gray-200 rounded-lg px-4 flex-row items-center justify-between bg-white"
                                >
                                    <Text className={`text-base ${patient.gender === 'Select Gender' ? 'text-gray-400' : 'text-gray-700'}`}>
                                        {patient.gender}
                                    </Text>
                                    <Icon
                                        icon={showGenderDropdown ? REGISTER_ICONS.chevronUp : REGISTER_ICONS.chevronDown}
                                        size={24}
                                        color="#666"
                                    />
                                </TouchableOpacity>

                                {showGenderDropdown && (
                                    <View
                                        className="absolute top-[48px] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                                        style={{ zIndex: 100 }}
                                    >
                                        {['Male', 'Female', 'Other'].map((g) => (
                                            <TouchableOpacity
                                                key={g}
                                                onPress={() => {
                                                    setPatient({ ...patient, gender: g });
                                                    setShowGenderDropdown(false);
                                                }}
                                                className={`px-4 py-3 border-b border-gray-50 ${patient.gender === g ? 'bg-blue-50' : ''}`}
                                            >
                                                <Text
                                                    className={`text-base ${patient.gender === g ? 'text-[#007AFF] font-bold' : 'text-gray-700'}`}
                                                >
                                                    {g}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <InputRow
                            label="Email"
                            value={patient.email}
                            onChangeText={(text: string) => setPatient({ ...patient, email: text })}
                            placeholder="Email address"
                            keyboardType="email-address"
                        />

                        {/* Action Buttons */}
                        <View className="flex-row gap-4 mt-8 justify-center">
                            <TouchableOpacity
                                onPress={handleClose}
                                className="px-4 py-2 rounded-lg bg-gray-100"
                            >
                                <Text className="text-gray-700 text-center font-bold text-lg">
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={!patient.name || !patient.mobile || patient.gender === 'Select Gender' || isSaving}
                                className={`px-4 py-2 rounded-lg min-w-[100px] flex-row items-center justify-center ${patient.name && patient.mobile && patient.gender !== 'Select Gender' && !isSaving
                                    ? 'bg-blue-700'
                                    : 'bg-blue-300'
                                    }`}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text className="text-white text-center font-bold text-lg">
                                        Save
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
