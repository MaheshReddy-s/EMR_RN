import React from 'react';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { DASHBOARD_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';

interface SearchBarProps {
    query: string;
    onChange: (text: string) => void;
    onClear: () => void;
    isActiveTabPatients: boolean;
}

const SearchBar = React.memo(({ query, onChange, onClear }: SearchBarProps) => {
    const isWeb = Platform.OS === 'web';

    return (
        <View className="px-4 bg-white" style={{ paddingVertical: isWeb ? 4 : 8 }}>
            <View
                className="flex-row items-center bg-gray-100 rounded-xl px-3"
                style={{ height: isWeb ? 36 : 44 }}
            >
                <Icon icon={DASHBOARD_ICONS.search} size={isWeb ? 18 : 20} color="#8E8E93" />
                <TextInput
                    className="flex-1 text-gray-800 ml-2 h-full"
                    style={{ fontSize: isWeb ? 14 : 16 }}
                    placeholder="Search"
                    placeholderTextColor="#8E8E93"
                    value={query}
                    onChangeText={onChange}
                    autoCorrect={false}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={onClear}>
                        <Icon icon={DASHBOARD_ICONS.cancel} size={isWeb ? 16 : 18} color="#8E8E93" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

export default SearchBar;
