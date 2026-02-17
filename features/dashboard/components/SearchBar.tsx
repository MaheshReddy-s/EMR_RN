import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface SearchBarProps {
    query: string;
    onChange: (text: string) => void;
    onClear: () => void;
    isActiveTabPatients: boolean;
}

const SearchBar = React.memo(({ query, onChange, onClear }: SearchBarProps) => (
    <View className="px-4 py-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 h-11">
            <Icon icon={DASHBOARD_ICONS.search} size={20} color="#8E8E93" />
            <TextInput
                className="flex-1 text-base text-gray-800 ml-2 h-full"
                placeholder="Search"
                placeholderTextColor="#8E8E93"
                value={query}
                onChangeText={onChange}
                autoCorrect={false}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={onClear}>
                    <Icon icon={DASHBOARD_ICONS.cancel} size={18} color="#8E8E93" />
                </TouchableOpacity>
            )}
        </View>
    </View>
));

export default SearchBar;
