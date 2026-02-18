import type { Patient } from '@/entities';

export type DashboardTab = 'appointments' | 'all-patients';

export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    patientMobile: string;
    status: 'scheduled' | 'new-patient' | 'completed' | 'in-progress';
    time: string;
    timestamp: number;
    type?: string;
    isConsulted?: boolean;
}

export interface StripDateItem {
    date: number;
    day: string;
    fullDate: Date;
    isToday: boolean;
    month: string;
}

export interface MonthDateItem {
    date: number;
    day: string;
    fullDate: Date;
    isToday: boolean;
    isCurrentMonth: boolean;
}

export type PatientItem = Patient;
