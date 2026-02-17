import React from 'react';
import { Platform } from 'react-native';
import {
    Ionicons,
    MaterialIcons,
    MaterialCommunityIcons
} from '@expo/vector-icons';
import { SymbolView, SymbolWeight } from 'expo-symbols';
import { IconDef, getIconName, getIconLibrary, IconLibrary } from '@/constants/icons';

interface IconProps {
    icon?: IconDef;
    library?: IconLibrary;
    ios?: string;
    android?: string;
    size?: number;
    color?: string;
    style?: any;
    weight?: SymbolWeight;
}

/**
 * A platform-aware icon component.
 * On iOS, it uses SFSymbols via 'expo-symbols' if defined in the IconDef.
 * Otherwise, it falls back to @expo/vector-icons.
 */
export const Icon = ({ icon, library: libProp, ios, android, size = 24, color, style, weight = 'regular' }: IconProps) => {
    // Safety check: if neither 'icon' nor direct props are provided, bail out
    if (!icon && !libProp && !ios && !android) return null;

    const library = icon ? getIconLibrary(icon) : libProp;
    const name = icon ? getIconName(icon) : (Platform.OS === 'ios' ? ios : android);

    if (!name || !library) return null;

    // Use standard vector icons for everything to ensure maximum stability 
    // especially during high-stress renders like Modals with complex state.
    // We can fallback to SymbolView only if specifically requested and on iOS.
    if (Platform.OS === 'ios' && library === 'SFSymbols') {
        try {
            return (
                <SymbolView
                    name={name as any}
                    size={size}
                    tintColor={color}
                    style={style}
                    weight={weight}
                />
            );
        } catch (e) {
            // Fallback to a safe material icon if SFSymbol fails
            return <MaterialCommunityIcons name="help-circle" size={size} color={color} style={style} />;
        }
    }

    // Fallback to vector icons
    switch (library) {
        case 'MaterialIcons':
            return <MaterialIcons name={name as any} size={size} color={color} style={style} />;
        case 'MaterialCommunityIcons':
            return <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />;
        case 'Ionicons':
        default:
            return <Ionicons name={name as any} size={size} color={color} style={style} />;
    }
};
