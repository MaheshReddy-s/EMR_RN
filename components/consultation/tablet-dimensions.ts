import { Dimensions } from 'react-native';

export const ACTION_BUTTONS_RESERVED_WIDTH = 100;
export const MIN_CONTENT_WIDTH = 600;
export const MAX_CONTENT_WIDTH = 1200;
export const DEFAULT_CONTENT_WIDTH = 800;
export const MIN_ROW_HEIGHT = 10;

export function getOptimizedContentWidth(): number {
    const screenWidth = Dimensions.get('window').width;
    const calculatedWidth = screenWidth - ACTION_BUTTONS_RESERVED_WIDTH;

    if (calculatedWidth < MIN_CONTENT_WIDTH) {
        return DEFAULT_CONTENT_WIDTH;
    }

    if (calculatedWidth > MAX_CONTENT_WIDTH) {
        return MAX_CONTENT_WIDTH;
    }

    return Math.floor(calculatedWidth);
}
