import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Suggestion {
    id: string;
    label: string;
    frequency?: number;
}

interface SuggestionChipsProps {
    suggestions: Suggestion[];
    selectedIds: string[];
    onSelect: (suggestion: Suggestion) => void;
    onAddNew: () => void;
}

export default function SuggestionChips({
    suggestions,
    selectedIds,
    onSelect,
    onAddNew,
}: SuggestionChipsProps) {
    return (
        <View className="bg-gray-50 p-3 border-b border-gray-200">
            <ScrollView
                horizontal={false}
                showsVerticalScrollIndicator={false}
                className="max-h-32"
            >
                <View className="flex-row flex-wrap gap-2">
                    {suggestions.map((suggestion) => {
                        const isSelected = selectedIds.includes(suggestion.id);
                        return (
                            <TouchableOpacity
                                key={suggestion.id}
                                onPress={() => onSelect(suggestion)}
                                className={`px-3 py-2 rounded-full border ${isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm ${isSelected ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {suggestion.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Add New Button */}
                    <TouchableOpacity
                        onPress={onAddNew}
                        className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center"
                    >
                        <Text className="text-white text-lg font-bold">+</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

export type { Suggestion };
