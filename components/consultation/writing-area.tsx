import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface WritingAreaProps {
    value: string;
    onChangeText: (text: string) => void;
    onClearAll: () => void;
    elapsedTime: string;
}

export default function WritingArea({
    value,
    onChangeText,
    onClearAll,
    elapsedTime,
}: WritingAreaProps) {
    return (
        <View className="bg-white border-t border-gray-200">
            {/* Writing Input */}
            <View className="p-4">
                <Text className="text-gray-500 text-sm mb-2">You are writing:</Text>
                <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-4 text-base text-gray-800 min-h-[100px]"
                    placeholder="Write or type here"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                    value={value}
                    onChangeText={onChangeText}
                />
            </View>

            {/* Bottom Bar */}
            <View className="flex-row items-center justify-between px-4 pb-4">
                <TouchableOpacity
                    onPress={onClearAll}
                    className="px-4 py-2 rounded-lg border border-gray-300"
                >
                    <Text className="text-gray-700">Clear All</Text>
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <Text className="text-gray-500 mr-2">⏱</Text>
                    <Text className="text-gray-700 font-mono">{elapsedTime}</Text>
                </View>
            </View>
        </View>
    );
}
