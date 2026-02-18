import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { User } from '@/entities';
import type { DashboardTab, MonthDateItem } from '@/features/dashboard/types';

interface DashboardSidebarProps {
    user: User | null;
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
    onSettingsPress: () => void;
    currentMonth: string;
    monthDates: MonthDateItem[];
    selectedDate: Date;
    onNavigateMonth: (direction: 'prev' | 'next') => void;
    onGoToToday: () => void;
    onDateSelect: (date: Date) => void;
}

const DashboardSidebar = ({
    user,
    activeTab,
    onTabChange,
    onSettingsPress,
    currentMonth,
    monthDates,
    selectedDate,
    onNavigateMonth,
    onGoToToday,
    onDateSelect,
}: DashboardSidebarProps) => {
    return (
        <View className="w-60 bg-slate-900 h-full">
            <View className="p-4 border-b border-slate-700">
                <Text className="text-xl font-bold text-white">AVANCE</Text>
            </View>

            <View className="p-3 border-b border-slate-700">
                <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-teal-500 items-center justify-center mr-3">
                        <Text className="text-white text-base font-bold">S</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-medium text-sm">
                            {user ? `Dr. ${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Doctor'}
                        </Text>
                        <Text className="text-slate-400 text-[10px]">{user?.qualification || ''}</Text>
                    </View>
                </View>
            </View>

            <View className="p-3">
                <TouchableOpacity
                    onPress={() => onTabChange('appointments')}
                    className={`flex-row items-center px-3 py-2 rounded-xl mb-1.5 ${activeTab === 'appointments' ? 'bg-blue-600' : 'bg-transparent'}`}
                >
                    <Text className="mr-3 text-xs">[A]</Text>
                    <Text className={activeTab === 'appointments' ? 'text-white font-medium text-sm' : 'text-slate-300 text-sm'}>
                        Appointments
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onTabChange('all-patients')}
                    className={`flex-row items-center px-3 py-2 rounded-xl mb-1.5 ${activeTab === 'all-patients' ? 'bg-blue-600' : 'bg-transparent'}`}
                >
                    <Text className="mr-3 text-xs">[P]</Text>
                    <Text className={activeTab === 'all-patients' ? 'text-white font-medium text-sm' : 'text-slate-300 text-sm'}>
                        All Patients
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onSettingsPress} className="flex-row items-center px-3 py-2 rounded-xl mb-1.5">
                    <Text className="mr-3 text-xs">[S]</Text>
                    <Text className="text-slate-300 text-sm">Settings</Text>
                </TouchableOpacity>
            </View>

            <View className="p-3 mt-auto border-t border-slate-700">
                <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => onNavigateMonth('prev')}>
                        <Text className="text-slate-400">{'<'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onGoToToday}>
                        <Text className="text-slate-400 text-xs">{currentMonth}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onNavigateMonth('next')}>
                        <Text className="text-slate-400">{'>'}</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <View key={index} style={{ width: '14.28%' }} className="h-6 items-center justify-center">
                            <Text className="text-xs text-slate-500">{day}</Text>
                        </View>
                    ))}
                </View>

                <View className="flex-row flex-wrap">
                    {monthDates.map((item, index) => {
                        const isSelected = item.fullDate.toDateString() === selectedDate.toDateString();
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => onDateSelect(item.fullDate)}
                                style={{ width: '14.28%' }}
                                className="items-center justify-center py-1"
                            >
                                <View className={`w-7 h-7 items-center justify-center rounded-md ${isSelected
                                    ? 'bg-blue-500'
                                    : item.isToday
                                        ? 'bg-blue-900'
                                        : item.isCurrentMonth
                                            ? 'bg-slate-800'
                                            : 'bg-transparent'
                                    }`}
                                >
                                    <Text className={`text-xs ${isSelected
                                        ? 'text-white font-bold'
                                        : item.isToday
                                            ? 'text-blue-400'
                                            : item.isCurrentMonth
                                                ? 'text-slate-300'
                                                : 'text-slate-600'
                                        }`}
                                    >
                                        {item.date}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

export default DashboardSidebar;
