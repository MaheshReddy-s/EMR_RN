import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { StripDateItem } from '@/features/dashboard/types';

export interface CalendarStripProps {
    width: number;
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    onMonthChange: (month: string) => void;
    onGoToToday: () => void;
    visibleMonth: string;
}

const generateStripDates = (): StripDateItem[] => {
    const dates: StripDateItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysBefore = 183;
    const daysAfter = 183;

    const remainder = daysBefore % 7;
    const adjustedDaysBefore = daysBefore + ((3 - remainder + 7) % 7);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - adjustedDaysBefore);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysAfter);
    endDate.setHours(0, 0, 0, 0);

    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
        const date = new Date(current);
        date.setHours(0, 0, 0, 0);
        dates.push({
            date: date.getDate(),
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: date,
            isToday: date.getTime() === today.getTime(),
            month: date.toLocaleDateString('en-US', { month: 'long' }),
        });
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const allStripDates = generateStripDates();

const CalendarStrip = React.memo(({
    width,
    selectedDate,
    onDateSelect,
    onMonthChange,
    onGoToToday,
    visibleMonth,
}: CalendarStripProps) => {
    const flatListRef = useRef<FlatList<StripDateItem> | null>(null);
    const hasScrolledToToday = useRef(false);
    const itemWidth = useMemo(() => (width - 32) / 7, [width]);
    const weekWidth = itemWidth * 7;

    useEffect(() => {
        if (!hasScrolledToToday.current && flatListRef.current && allStripDates.length > 0) {
            const todayIndex = allStripDates.findIndex((d) => d.isToday);
            if (todayIndex !== -1) {
                const groupStart = todayIndex - 3;
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index: Math.max(0, groupStart),
                        animated: false,
                    });
                    hasScrolledToToday.current = true;
                }, 50);
            }
        }
    }, []);

    useEffect(() => {
        if (hasScrolledToToday.current && flatListRef.current) {
            const idx = allStripDates.findIndex((d) => d.fullDate.toDateString() === selectedDate.toDateString());
            if (idx !== -1) {
                const groupStart = idx - 3;
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index: Math.max(0, groupStart),
                        animated: true,
                    });
                }, 50);
            }
        }
    }, [selectedDate]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item?: StripDateItem }> }) => {
        if (viewableItems.length > 0) {
            const middleItem = viewableItems[Math.floor(viewableItems.length / 2)];
            if (middleItem?.item?.month) {
                onMonthChange(middleItem.item.month);
            }
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const renderItem = useCallback(({ item }: { item: StripDateItem }) => {
        const isSelected = item.fullDate.toDateString() === selectedDate.toDateString();
        return (
            <Pressable
                onPress={() => onDateSelect(item.fullDate)}
                style={{ width: itemWidth }}
                className="items-center justify-center py-5"
            >
                <View
                    className="w-14 h-14 items-center justify-center"
                    style={{ backgroundColor: isSelected ? '#007AFF' : 'transparent', borderRadius: 5 }}
                >
                    <Text className={`text-s leading-none ${isSelected ? 'text-white' : item.isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                        {item.date}
                    </Text>
                    <Text className={`text-xs mt-0.5 leading-none ${isSelected ? 'text-white' : item.isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                        {item.day}
                    </Text>
                </View>
            </Pressable>
        );
    }, [itemWidth, onDateSelect, selectedDate]);

    return (
        <View className="bg-white border-b border-gray-100">
            <Pressable onPress={onGoToToday} className="items-center py-2">
                <Text className="text-lg mt-5 font-bold text-blue-600">{visibleMonth}</Text>
            </Pressable>
            <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={allStripDates}
                keyExtractor={(_, index) => index.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
                snapToInterval={weekWidth}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                    length: itemWidth,
                    offset: itemWidth * index,
                    index,
                })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={renderItem}
            />
        </View>
    );
});

export default CalendarStrip;
