import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DiagnosisItem {
    id: string;
    name: string;
    notes?: string;
}

interface DiagnosisSectionProps {
    items: DiagnosisItem[];
    onAddItem: (name: string) => void;
    onRemoveItem: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
    onDraw: (id: string) => void;
}

export default function DiagnosisSection({
    items,
    onRemoveItem,
    onUpdateNotes,
    onDraw,
}: DiagnosisSectionProps) {
    return (
        <View className="bg-white">
            {/* Section Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                <View className="flex-row items-center">
                    <Text className="text-gray-800 font-semibold">Diagnosis</Text>
                    <View className="ml-2 w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                        <Text className="text-white text-xs">{items.length}</Text>
                    </View>
                </View>
            </View>

            {/* Diagnosis Items */}
            {items.map((item, index) => (
                <View
                    key={item.id}
                    className="flex-row items-center px-4 py-3 border-b border-gray-100"
                >
                    <Text className="text-gray-800 flex-1">{item.name}</Text>

                    {/* Notes Input / Drawing Area */}
                    <View className="flex-row items-center gap-2">
                        <TextInput
                            className="w-24 px-2 py-1 bg-gray-100 rounded text-sm text-gray-600"
                            placeholder="Notes..."
                            placeholderTextColor="#9CA3AF"
                            value={item.notes}
                            onChangeText={(text) => onUpdateNotes(item.id, text)}
                        />

                        {/* Draw Button */}
                        <TouchableOpacity
                            onPress={() => onDraw(item.id)}
                            className="w-8 h-8 rounded bg-gray-100 items-center justify-center"
                        >
                            <Text>✏️</Text>
                        </TouchableOpacity>

                        {/* Action Buttons */}
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
                    <Text className="text-gray-400">No diagnosis added yet</Text>
                    <Text className="text-gray-400 text-sm">Select from suggestions above</Text>
                </View>
            )}
        </View>
    );
}

export type { DiagnosisItem };
