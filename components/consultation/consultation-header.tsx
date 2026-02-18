import { HEADER_ICONS, CONSULTATION_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import { Text, TouchableOpacity, View, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

interface ConsultationHeaderProps {
    patientName: string;
    patientMobile: string;
    patientAge?: number;
    patientGender?: string;
    consultationDate: string;
    onBack: () => void;
    onNext: () => void;
    onEditProfile: () => void;
    onViewHistory: () => void;
    onViewPhotographs: () => void;
    onViewLabReports: () => void;
}

export default function ConsultationHeader({
    patientName,
    patientMobile,
    patientAge,
    patientGender,
    consultationDate,
    onBack,
    onNext,
    onEditProfile,
    onViewHistory,
    onViewPhotographs,
    onViewLabReports,
}: ConsultationHeaderProps) {
    return (
        <View className="bg-white border-b border-gray-200">
            {/* Top Row - Navigation */}
            <View className={`flex-row items-center justify-between px-4 ${isWeb ? 'pt-4 pb-2' : 'pt-12 pb-2'}`}>
                <TouchableOpacity onPress={onBack} className={`flex-row items-center border border-gray-300 rounded-lg ${isWeb ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
                    <Icon icon={HEADER_ICONS.chevronBack} size={isWeb ? 18 : 20} color="#666" />
                    <Text className="text-gray-600 font-medium ml-1" style={isWeb ? { fontSize: 13 } : undefined}>Back</Text>
                </TouchableOpacity>

                <Text className="text-gray-600 font-medium" style={isWeb ? { fontSize: 13 } : undefined}>{consultationDate}</Text>

                <TouchableOpacity onPress={onNext} className={`flex-row items-center border border-[#007AFF] rounded-lg ${isWeb ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
                    <Text className="text-[#007AFF] font-medium mr-1" style={isWeb ? { fontSize: 13 } : undefined}>Next</Text>
                    <Icon icon={HEADER_ICONS.playCircleOutline} size={isWeb ? 18 : 20} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Patient Info Row */}
            <View className={`flex-row items-center px-4 ${isWeb ? 'py-2' : 'py-3'}`}>
                <View className={`${isWeb ? 'w-10 h-10 mr-2' : 'w-14 h-14 mr-3'} rounded-full bg-gray-200 items-center justify-center`}>
                    <Text className={isWeb ? 'text-lg' : 'text-2xl'}>👤</Text>
                </View>

                <View className="flex-1">
                    <Text className={`${isWeb ? 'text-base' : 'text-lg'} font-semibold text-gray-800`}>
                        Name: {patientName}
                    </Text>
                    <Text className={`${isWeb ? 'text-base' : 'text-lg'} font-semibold text-gray-800`}>
                        Mobile: {patientMobile}
                    </Text>
                </View>

                <View>
                    <Text className={`${isWeb ? 'text-base' : 'text-lg'} font-semibold text-gray-800`}>
                        Age: {patientAge}
                    </Text>
                    <Text className={`${isWeb ? 'text-base' : 'text-lg'} font-semibold text-gray-800`}>
                        Gender: {patientGender}
                    </Text>
                </View>
            </View>

            {/* Quick Action Buttons */}
            <View className={`flex-row items-center justify-center px-4 gap-2 ${isWeb ? 'pb-2' : 'pb-3'}`}>
                {[
                    { label: 'Edit Profile', onPress: onEditProfile },
                    { label: 'History', onPress: onViewHistory },
                    { label: 'Photographs', onPress: onViewPhotographs },
                    { label: 'Lab Reports', onPress: onViewLabReports },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        onPress={item.onPress}
                        className={`${isWeb ? 'w-24 py-1.5' : 'w-28 py-2'} rounded-lg border border-gray-300 items-center`}
                    >
                        <Text
                            numberOfLines={1}
                            className={`text-gray-500 text-center ${isWeb ? 'text-[12px]' : 'text-[13px]'}`}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
