import { FOLLOW_UP_ICONS } from '@/constants/icons';
import { Icon } from '@/components/ui/Icon';
import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface FollowUpModalProps {
    visible: boolean;
    onClose: () => void;
    onSkip: () => void;
    onContinue: (date: Date) => void;
}

const QUICK_OPTIONS = [
    { label: 'Today', days: 0 },
    { label: '3 Days', days: 3 },
    { label: '1 Week', days: 7 },
    { label: '15 Days', days: 15 },
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
];

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function isSameDay(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function FollowUpModal({ visible, onClose, onSkip, onContinue }: FollowUpModalProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /**
     * Issue #10: Month navigation for the follow-up calendar.
     */
    const goToPreviousMonth = () => {
        setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days: { date: Date | null; day: number | null }[] = [];

        // Pad with empty cells for the start of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: null, day: null });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push({ date, day: i });
        }

        return days;
    }, [currentMonth]);

    const handleQuickSelect = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        date.setHours(0, 0, 0, 0);
        setSelectedDate(date);
        setCurrentMonth(date);
    };

    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const selectedDateAtStartOfDay = new Date(selectedDate);
    selectedDateAtStartOfDay.setHours(0, 0, 0, 0);
    const isFutureSelected = selectedDateAtStartOfDay.getTime() > today.getTime();

    const handleContinue = () => {
        if (!isFutureSelected) return;
        onContinue(selectedDateAtStartOfDay);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 bg-black/50 justify-center items-center p-4">
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        width: 450,
                        maxWidth: '95%',
                        padding: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 5,
                    }}
                >
                    <Text className="text-xl font-bold text-gray-800 mb-4">Follow-Up Date</Text>

                    {/* Quick Options */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row gap-2">
                            {QUICK_OPTIONS.map((opt) => {
                                const optDate = new Date();
                                optDate.setDate(optDate.getDate() + opt.days);
                                optDate.setHours(0, 0, 0, 0);
                                const isActive = isSameDay(selectedDate, optDate);

                                return (
                                    <TouchableOpacity
                                        key={opt.label}
                                        onPress={() => handleQuickSelect(opt.days)}
                                        className={`px-2 py-2 rounded-full border ${isActive
                                            ? 'bg-[#007AFF] border-[#007AFF]'
                                            : 'bg-white border-gray-300'
                                            }`}
                                    >
                                        <Text
                                            className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-700'
                                                }`}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Month Navigation */}
                    <View className="flex-row items-center justify-between mb-3">
                        <TouchableOpacity onPress={goToPreviousMonth} className="p-2">
                            <Icon icon={FOLLOW_UP_ICONS.chevronBack} size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <Text className="text-base font-semibold text-gray-800">{monthLabel}</Text>
                        <TouchableOpacity onPress={goToNextMonth} className="p-2">
                            <Icon icon={FOLLOW_UP_ICONS.chevronForward} size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Day Labels */}
                    <View className="flex-row mb-1">
                        {DAY_LABELS.map((d) => (
                            <View key={d} className="flex-1 items-center">
                                <Text className="text-xs text-gray-400 font-semibold">{d}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View className="flex-row flex-wrap">
                        {calendarDays.map((cell, idx) => {
                            if (!cell.date) {
                                return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 38 }} />;
                            }

                            const isSelected = isSameDay(selectedDate, cell.date);
                            const isPast = cell.date < today;
                            const isToday = isSameDay(cell.date, today);

                            return (
                                <TouchableOpacity
                                    key={`day-${cell.day}`}
                                    onPress={() => !isPast && setSelectedDate(cell.date!)}
                                    disabled={isPast}
                                    style={{ width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <View
                                        className={`w-8 h-8 rounded-full items-center justify-center ${isSelected
                                            ? 'bg-[#007AFF]'
                                            : isToday
                                                ? 'bg-blue-100'
                                                : ''
                                            }`}
                                    >
                                        <Text
                                            className={`text-sm ${isSelected
                                                ? 'text-white font-bold'
                                                : isPast
                                                    ? 'text-gray-300'
                                                    : isToday
                                                        ? 'text-[#007AFF] font-bold'
                                                        : 'text-gray-700'
                                                }`}
                                        >
                                            {cell.day}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected Date Display */}
                    <Text className="text-center text-gray-500 text-sm mt-3">
                        Selected: {formatDate(selectedDate)}
                    </Text>
                    {!isFutureSelected ? (
                        <Text className="text-center text-red-500 text-sm mt-1 mb-4">
                            Select future date to continue
                        </Text>
                    ) : (
                        <View className="mb-4" />
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row gap-3">
                        <TouchableOpacity onPress={onSkip} className="flex-1 py-3 rounded-xl bg-gray-100">
                            <Text className="text-center text-gray-600 font-semibold">Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleContinue}
                            disabled={!isFutureSelected}
                            className={`flex-1 py-3 rounded-xl ${isFutureSelected ? 'bg-[#007AFF]' : 'bg-gray-300'}`}
                        >
                            <Text className={`text-center font-semibold ${isFutureSelected ? 'text-white' : 'text-gray-500'}`}>
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
