import { Text, TouchableOpacity, View } from 'react-native';

interface InstructionItem {
    id: string;
    text: string;
}

interface InstructionSectionProps {
    items: InstructionItem[];
    onAddItem: (text: string) => void;
    onRemoveItem: (id: string) => void;
    onUpdateItem: (id: string, text: string) => void;
}

export default function InstructionSection({
    items,
    onRemoveItem,
}: InstructionSectionProps) {
    return (
        <View className="bg-white">
            {/* Section Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                <View className="flex-row items-center">
                    <Text className="text-gray-800 font-semibold">Instructions</Text>
                    <View className="ml-2 w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                        <Text className="text-white text-xs">{items.length}</Text>
                    </View>
                </View>
            </View>

            {/* Instruction Items */}
            {items.map((item) => (
                <View
                    key={item.id}
                    className="flex-row items-center px-4 py-3 border-b border-gray-100"
                >
                    <Text className="text-gray-800 flex-1">{item.text}</Text>

                    {/* Action Buttons */}
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity className="w-8 h-8 rounded bg-gray-100 items-center justify-center">
                            <Text>📋</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onRemoveItem(item.id)}
                            className="w-8 h-8 rounded bg-red-100 items-center justify-center"
                        >
                            <Text>🗑</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

            {items.length === 0 && (
                <View className="py-8 items-center">
                    <Text className="text-gray-400">No instructions added yet</Text>
                    <Text className="text-gray-400 text-sm">Select from suggestions above</Text>
                </View>
            )}
        </View>
    );
}

export type { InstructionItem };
