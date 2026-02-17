import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PrescriptionItem {
    id: string;
    name: string;
    dosage: string; // M-O-E-N format
    duration: string;
    notes?: string;
}

interface PrescriptionSectionProps {
    items: PrescriptionItem[];
    onAddItem: (name: string) => void;
    onRemoveItem: (id: string) => void;
    onUpdateDosage: (id: string, dosage: string) => void;
    onUpdateDuration: (id: string, duration: string) => void;
    onDraw: (id: string) => void;
}

// Dosage time slots
const dosageSlots = ['M', 'O', 'E', 'N']; // Morning, Afternoon, Evening, Night

export default function PrescriptionSection({
    items,
    onRemoveItem,
    onUpdateDosage,
    onUpdateDuration,
    onDraw,
}: PrescriptionSectionProps) {

    const toggleDosageSlot = (itemId: string, currentDosage: string, slot: string) => {
        const slots = currentDosage.split('-');
        const slotIndex = dosageSlots.indexOf(slot);

        if (slots[slotIndex] === slot) {
            slots[slotIndex] = 'O'; // Off
        } else {
            slots[slotIndex] = slot;
        }

        onUpdateDosage(itemId, slots.join('-'));
    };

    return (
        <View className="bg-white">
            {/* Section Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                <View className="flex-row items-center">
                    <Text className="text-gray-800 font-semibold">Prescriptions</Text>
                    <View className="ml-2 w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                        <Text className="text-white text-xs">{items.length}</Text>
                    </View>
                </View>
            </View>

            {/* Prescription Items */}
            {items.map((item, index) => (
                <View
                    key={item.id}
                    className="px-4 py-3 border-b border-gray-100"
                >
                    {/* Row 1: Name and basic info */}
                    <View className="flex-row items-center mb-2">
                        <Text className="text-gray-500 mr-2">{index + 1}.</Text>
                        <Text className="text-gray-800 font-medium flex-1">{item.name}</Text>
                    </View>

                    {/* Row 2: Dosage, Duration, Actions */}
                    <View className="flex-row items-center gap-3">
                        {/* Dosage Slots */}
                        <View className="flex-row gap-1">
                            {dosageSlots.map((slot) => {
                                const isActive = item.dosage.includes(slot);
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        onPress={() => toggleDosageSlot(item.id, item.dosage, slot)}
                                        className={`w-8 h-8 rounded items-center justify-center ${isActive ? 'bg-blue-500' : 'bg-gray-200'
                                            }`}
                                    >
                                        <Text className={isActive ? 'text-white font-medium' : 'text-gray-600'}>
                                            {slot}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Duration */}
                        <View className="flex-row items-center bg-gray-100 rounded px-2 py-1">
                            <TextInput
                                className="w-12 text-center text-gray-800"
                                placeholder="90"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                value={item.duration}
                                onChangeText={(text) => onUpdateDuration(item.id, text)}
                            />
                            <Text className="text-gray-500 text-sm">Days</Text>
                        </View>

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

                    {/* Notes/Drawing Area */}
                    {item.notes && (
                        <View className="mt-2 p-2 bg-gray-50 rounded">
                            <Text className="text-gray-600 text-sm italic">{item.notes}</Text>
                        </View>
                    )}
                </View>
            ))}

            {items.length === 0 && (
                <View className="py-8 items-center">
                    <Text className="text-gray-400">No prescriptions added yet</Text>
                    <Text className="text-gray-400 text-sm">Select from suggestions above</Text>
                </View>
            )}
        </View>
    );
}

export type { PrescriptionItem };
