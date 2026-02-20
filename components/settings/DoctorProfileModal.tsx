import { Icon } from '@/components/ui/Icon';
import { CONSULTATION_ICONS, SETTINGS_ICONS } from '@/constants/icons';
import { DrawingCanvas, StrokeData } from '@/components/consultation/drawing-canvas';
import type { User } from '@/entities';
import { AuthRepository } from '@/repositories';
import React, { useEffect, useState } from 'react';
import { Skia, PaintStyle, StrokeCap, StrokeJoin, ImageFormat } from '@shopify/react-native-skia';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface DoctorProfileModalProps {
    visible: boolean;
    onClose: () => void;
    user: User | null;
    onSave?: (updatedUser: User) => void;
}

/**
 * Doctor Profile Edit Modal
 * Matches Swift: MSEditDoctorProfileViewController
 * Fields: prefix, first_name, last_name, email (read-only), qualification,
 *         registration_no, department, designation, gender, age, phone_no
 */

const encodeStrokesToBase64 = (strokes: StrokeData[]): string => {
    if (!strokes || strokes.length === 0) return '';

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    strokes.forEach(s => {
        if (!s.svg) return;
        const path = Skia.Path.MakeFromSVGString(s.svg);
        if (path) {
            const pb = path.computeTightBounds();
            const halfWidth = (s.width || 2) / 2;
            minX = Math.min(minX, pb.x - halfWidth);
            minY = Math.min(minY, pb.y - halfWidth);
            maxX = Math.max(maxX, pb.x + pb.width + halfWidth);
            maxY = Math.max(maxY, pb.y + pb.height + halfWidth);
        }
    });

    if (minX === Infinity) return '';

    const padding = 20;
    const width = Math.max(1, maxX - minX + padding * 2);
    const height = Math.max(1, maxY - minY + padding * 2);

    const surface = Skia.Surface.Make(width, height);
    if (!surface) return '';
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));

    canvas.translate(-minX + padding, -minY + padding);

    strokes.forEach(s => {
        if (!s.svg) return;
        const path = Skia.Path.MakeFromSVGString(s.svg);
        if (path) {
            const paint = Skia.Paint();
            paint.setStyle(PaintStyle.Stroke);
            paint.setColor(Skia.Color(s.color));
            paint.setStrokeWidth(s.width || 2);
            paint.setStrokeCap(StrokeCap.Round);
            paint.setStrokeJoin(StrokeJoin.Round);
            canvas.drawPath(path, paint);
        }
    });

    const image = surface.makeImageSnapshot();
    const base64 = image.encodeToBase64(ImageFormat.PNG, 100);
    return `data:image/png;base64,${base64}`;
}

export function DoctorProfileModal({ visible, onClose, user, onSave }: DoctorProfileModalProps) {
    const isWeb = Platform.OS === 'web';
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<User & { prefix?: string, signature?: any }>>({});

    // Dropdown state
    const [activeDropdown, setActiveDropdown] = useState<{
        key: string;
        label: string;
        options: string[];
    } | null>(null);

    useEffect(() => {
        if (visible && user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                qualification: user.qualification || '',
                registration_no: user.registration_no || '',
                department: user.department || '',
                designation: user.designation || '',
                gender: user.gender || 'Male',
                age: user.age || '',
                prefix: (user as any).prefix || 'Dr.',
                phone_no: user.phone_no || '',
                signature: user.signature || '',
            });
        }
    }, [visible, user]);

    useEffect(() => {
        if (!visible) {
            setActiveDropdown(null);
        }
    }, [visible]);

    const handleSave = async () => {
        if (!formData.first_name?.trim()) {
            Alert.alert('Error', 'First name is required');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'Invalid user session');
            return;
        }

        setIsSaving(true);
        try {
            // Matches Swift: MSNetworkRequest.APIClient.updateDoctorDetails(with: dict)
            const payload = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                qualification: formData.qualification,
                registration_no: formData.registration_no,
                department: formData.department,
                designation: formData.designation,
                gender: formData.gender,
                age: formData.age,
                prefix: formData.prefix,
                phone_no: formData.phone_no,
            };

            let finalSignature = formData.signature || '';
            if (Array.isArray(formData.signature) && formData.signature.length > 0) {
                finalSignature = encodeStrokesToBase64(formData.signature);
            } else if (Array.isArray(formData.signature) && formData.signature.length === 0) {
                finalSignature = '';
            }

            const payloadWithSignature = { ...payload, signature: finalSignature };

            const response = await AuthRepository.updateDoctorProfile(payloadWithSignature);
            const updatedData = response?.data || response;
            const updatedUser = { ...user, ...updatedData, ...payload, signature: finalSignature } as User;

            onSave?.(updatedUser);
            onClose();
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            if (__DEV__) console.error('Failed to update doctor profile:', error);
            Alert.alert('Error', 'Could not update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const openDropdown = (key: string, label: string, options: string[]) => {
        setActiveDropdown({ key, label, options });
    };

    const renderField = (
        label: string,
        value: string,
        key: string,
        placeholder: string,
        options?: {
            keyboardType?: any;
            isDropdown?: boolean;
            dropdownOptions?: string[];
            readOnly?: boolean;
            webWidth?: string;
            maxLength?: number;
        }
    ) => {
        const { keyboardType = 'default', isDropdown = false, dropdownOptions = [], readOnly = false, webWidth = 'w-full', maxLength } = options || {};

        if (isWeb) {
            return (
                <View className={`mb-4 px-2 ${webWidth}`}>
                    <Text className="text-gray-600 font-medium mb-1.5 ml-1 text-sm">{label}</Text>
                    {isDropdown ? (
                        <TouchableOpacity
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                            onPress={() => openDropdown(key, label, dropdownOptions)}
                        >
                            <Text className="text-gray-900 text-base">{value || placeholder}</Text>
                            <Icon icon={SETTINGS_ICONS.chevronRight} size={16} color="#666" />
                        </TouchableOpacity>
                    ) : (
                        <TextInput
                            className={`border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base ${readOnly ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`}
                            value={value}
                            onChangeText={(text) => {
                                if (readOnly) return;
                                if (maxLength && text.length > maxLength) return;
                                setFormData(prev => ({ ...prev, [key]: text }));
                            }}
                            placeholder={placeholder}
                            placeholderTextColor="#9ca3af"
                            keyboardType={keyboardType}
                            editable={!readOnly}
                        />
                    )}
                </View>
            );
        }

        // Mobile/Tablet Layout
        return (
            <View className="flex-row items-center mb-5 px-6">
                <Text className="text-gray-800 text-[16px] font-medium w-32">{label}</Text>
                <View className="flex-1">
                    {isDropdown ? (
                        <TouchableOpacity
                            className="bg-[#f2f4f7] rounded-md px-4 py-3 flex-row items-center justify-between"
                            onPress={() => openDropdown(key, label, dropdownOptions)}
                        >
                            <Text className="text-[#007AFF] text-[16px]">{value || placeholder}</Text>
                            <Icon icon={SETTINGS_ICONS.chevronRight} size={16} color="#007AFF" />
                        </TouchableOpacity>
                    ) : (
                        <TextInput
                            className={`rounded-md px-4 py-3 text-[16px] ${readOnly ? 'bg-gray-100 text-gray-500' : 'bg-[#f2f4f7] text-gray-900'}`}
                            value={value}
                            onChangeText={(text) => {
                                if (readOnly) return;
                                if (maxLength && text.length > maxLength) return;
                                setFormData(prev => ({ ...prev, [key]: text }));
                            }}
                            placeholder={placeholder}
                            placeholderTextColor="#9ca3af"
                            keyboardType={keyboardType}
                            editable={!readOnly}
                        />
                    )}
                </View>
            </View>
        );
    };

    const handleBackdropPress = () => {
        if (activeDropdown) {
            setActiveDropdown(null);
            return;
        }
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                if (activeDropdown) {
                    setActiveDropdown(null);
                    return;
                }
                onClose();
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <Pressable className="flex-1 justify-center items-center bg-black/40 px-4 py-8" onPress={handleBackdropPress}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        className={`w-full ${isWeb ? 'max-w-4xl' : 'max-w-[500px]'} bg-white rounded-3xl shadow-xl overflow-hidden`}
                        style={{ maxHeight: '100%' }}
                    >
                        {/* Header — matches Swift navigation bar with Cancel and Done */}
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                            <TouchableOpacity onPress={onClose} className="p-2">
                                <Text className="text-[#007AFF] text-[17px]">Cancel</Text>
                            </TouchableOpacity>
                            <Text className="text-gray-900 text-[18px] font-bold">Edit Profile</Text>
                            <TouchableOpacity onPress={handleSave} disabled={isSaving} className="p-2">
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#007AFF" />
                                ) : (
                                    <Text className="text-[#007AFF] text-[17px] font-semibold">Done</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            className="py-6 max-h-[80vh]"
                            keyboardShouldPersistTaps="handled"
                        >
                            <View className={isWeb ? "flex-row flex-wrap px-4" : ""}>
                                {/* Row 1: Prefix + First Name + Last Name */}
                                {renderField('Prefix', formData.prefix || '', 'prefix', 'Dr.', {
                                    isDropdown: true,
                                    dropdownOptions: ['Dr.', 'Mr.', 'Mrs.', 'Ms.'],
                                    webWidth: 'w-1/6',
                                })}
                                {renderField('First Name', formData.first_name || '', 'first_name', 'First name', {
                                    webWidth: 'w-5/12',
                                })}
                                {renderField('Last Name', formData.last_name || '', 'last_name', 'Last name', {
                                    webWidth: 'w-5/12',
                                })}

                                {/* Row 2: Email (read-only) + Phone */}
                                {renderField('Email', formData.email || '', 'email', 'Email', {
                                    keyboardType: 'email-address',
                                    readOnly: true,
                                    webWidth: 'w-1/2',
                                })}
                                {renderField('Phone', formData.phone_no || '', 'phone_no', 'Phone number', {
                                    keyboardType: 'phone-pad',
                                    maxLength: 10,
                                    webWidth: 'w-1/2',
                                })}

                                {/* Row 3: Qualification + Registration No */}
                                {renderField('Qualification', formData.qualification || '', 'qualification', 'MBBS, MD...', {
                                    webWidth: 'w-1/2',
                                })}
                                {renderField('Reg. No', formData.registration_no || '', 'registration_no', 'Registration number', {
                                    webWidth: 'w-1/2',
                                })}

                                {/* Row 4: Department + Designation */}
                                {renderField('Department', formData.department || '', 'department', 'Department', {
                                    webWidth: 'w-1/2',
                                })}
                                {renderField('Designation', formData.designation || '', 'designation', 'Designation', {
                                    webWidth: 'w-1/2',
                                })}

                                {/* Row 5: Gender + Age */}
                                {renderField('Gender', formData.gender || 'Male', 'gender', 'Gender', {
                                    isDropdown: true,
                                    dropdownOptions: ['Male', 'Female'],
                                    webWidth: 'w-1/2',
                                })}
                                {renderField('Age', formData.age || '', 'age', 'Age', {
                                    keyboardType: 'numeric',
                                    maxLength: 2,
                                    webWidth: 'w-1/2',
                                })}

                                {/* Row 6: Signature */}
                                {isWeb ? (
                                    <View className="mb-4 px-2 w-full mt-2">
                                        <View className="flex-row items-center justify-between mb-1.5 ml-1">
                                            <Text className="text-gray-600 font-medium text-sm">Signature</Text>
                                            <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, signature: [] }))} className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full">
                                                <Icon icon={CONSULTATION_ICONS.brush} size={14} color="#FF3B30" />
                                                <Text className="text-[#FF3B30] text-xs font-medium ml-1">Clear</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View className="border border-gray-200 rounded-xl h-40 bg-gray-50 overflow-hidden" style={{ zIndex: 10 }}>
                                            {typeof formData.signature === 'string' && formData.signature.length > 0 ? (
                                                <Image source={{ uri: formData.signature.startsWith('data:') ? formData.signature : `data:image/png;base64,${formData.signature}` }} style={{ width: '80%', height: '80%' }} resizeMode="contain" />
                                            ) : (
                                                <DrawingCanvas
                                                    canvasOnly
                                                    initialDrawings={Array.isArray(formData.signature) ? formData.signature : []}
                                                    onStrokesChange={(strokes) => setFormData((prev: any) => ({ ...prev, signature: strokes }))}
                                                    penColor="#000000"
                                                    penThickness={2}
                                                    isErasing={false}
                                                />
                                            )}
                                        </View>
                                    </View>
                                ) : (
                                    <View className="mb-5 px-6 w-full">
                                        <View className="flex-row justify-between items-center mb-2">
                                            <Text className="text-gray-800 text-[16px] font-medium w-32">Signature</Text>
                                            <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, signature: [] }))} className="flex-row items-center bg-[#f2f4f7] px-3 py-2 rounded-lg">
                                                <Icon icon={CONSULTATION_ICONS.brush} size={16} color="#FF3B30" />
                                                <Text className="text-[#FF3B30] text-[14px] font-medium ml-1.5">Clear</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View className="h-40 bg-[#f2f4f7] rounded-xl overflow-hidden mt-2" style={{ zIndex: 10 }}>
                                            {typeof formData.signature === 'string' && formData.signature.length > 0 ? (
                                                <Image source={{ uri: formData.signature.startsWith('data:') ? formData.signature : `data:image/png;base64,${formData.signature}` }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                            ) : (
                                                <DrawingCanvas
                                                    canvasOnly
                                                    initialDrawings={Array.isArray(formData.signature) ? formData.signature : []}
                                                    onStrokesChange={(strokes) => setFormData((prev: any) => ({ ...prev, signature: strokes }))}
                                                    penColor="#000000"
                                                    penThickness={2}
                                                    isErasing={false}
                                                />
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View className="h-10" />
                        </ScrollView>
                    </Pressable>
                </Pressable>

                {activeDropdown ? (
                    <View className="absolute inset-0 justify-center items-center px-6" style={{ zIndex: 20 }}>
                        <Pressable
                            className="absolute inset-0 bg-black/50"
                            onPress={() => setActiveDropdown(null)}
                        />
                        <View className="bg-white rounded-2xl w-full max-w-[300px] overflow-hidden">
                            <View className="p-4 border-b border-gray-100 bg-gray-50">
                                <Text className="text-gray-900 font-bold text-center">{activeDropdown.label}</Text>
                            </View>
                            {activeDropdown.options.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    className="px-6 py-4 border-b border-gray-50 items-center"
                                    onPress={() => {
                                        setFormData(prev => ({ ...prev, [activeDropdown.key]: option }));
                                        setActiveDropdown(null);
                                    }}
                                >
                                    <Text className={`text-[17px] ${(formData as any)[activeDropdown.key] === option ? 'text-[#007AFF] font-bold' : 'text-gray-700'}`}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}
            </KeyboardAvoidingView>
        </Modal>
    );
}
