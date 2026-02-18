import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import {
    createEmptyNormalizedPatients,
    denormalizePatients,
    mergeNormalizedPatients,
    normalizePatients,
} from '@/entities';
import type { NormalizedPatients } from '@/entities';
import { useMemoryDiagnostics } from '@/hooks/useMemoryDiagnostics';
import { useTenant } from '@/hooks/useTenant';
import type { Patient } from '@/entities';
import { AppointmentRepository, PatientRepository } from '@/repositories';
import { useSessionStore } from '@/stores/session-store';
import type { Appointment, DashboardTab, MonthDateItem } from '@/features/dashboard/types';

const DASHBOARD_PATIENT_ENTITY_LIMIT = Number(
    process.env.EXPO_PUBLIC_DASHBOARD_PATIENT_LIMIT ||
    process.env.EXPO_PUBLIC_PATIENT_ENTITY_MAX ||
    5_000
);
const DASHBOARD_SEARCH_DEBOUNCE_MS = Number(process.env.EXPO_PUBLIC_SEARCH_DEBOUNCE_MS || 300);

const generateMonthDates = (viewDate: Date): MonthDateItem[] => {
    const dates: MonthDateItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    const current = new Date(startDate);
    while (current <= endDate) {
        const date = new Date(current);
        date.setHours(0, 0, 0, 0);
        dates.push({
            date: date.getDate(),
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: date,
            isToday: date.getTime() === today.getTime(),
            isCurrentMonth: date.getMonth() === month,
        });
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

export function useDashboard() {
    const { doctorId } = useTenant();
    const user = useSessionStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<DashboardTab>('appointments');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewingDate, setViewingDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedPatients, setSearchedPatients] = useState<Patient[] | null>(null);
    const [visibleMonth, setVisibleMonth] = useState(
        new Date().toLocaleDateString('en-US', { month: 'long' })
    );
    const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerInitialData, setRegisterInitialData] = useState({ name: '', mobile: '' });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [normalizedPatients, setNormalizedPatients] = useState<NormalizedPatients>(
        createEmptyNormalizedPatients()
    );
    const normalizedPatientsRef = useRef<NormalizedPatients>(createEmptyNormalizedPatients());
    const [afterCursor, setAfterCursor] = useState<string | null>(null);
    const [hasMorePatients, setHasMorePatients] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const searchRequestIdRef = useRef(0);
    const hasWarnedPatientCapRef = useRef(false);
    const onEndReachedCalledDuringMomentum = useRef(true);

    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isLargeScreen = width >= 1024;
    const isMediumScreen = width >= 768;

    const currentMonth = useMemo(
        () => viewingDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        [viewingDate]
    );
    const monthDates = useMemo(() => generateMonthDates(viewingDate), [viewingDate]);

    const navigateMonth = useCallback((direction: 'prev' | 'next') => {
        setViewingDate((prev) => {
            const next = new Date(prev);
            next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            return next;
        });
    }, []);

    const goToToday = useCallback(() => {
        const today = new Date();
        setSelectedDate(today);
        setViewingDate(today);
    }, []);

    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
    }, []);

    const filteredAppointments = useMemo(() => {
        if (!searchQuery.trim()) return appointments;
        return appointments.filter((a) =>
            a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.patientMobile && a.patientMobile.includes(searchQuery))
        );
    }, [appointments, searchQuery]);

    const patients = useMemo(
        () => denormalizePatients(normalizedPatients),
        [normalizedPatients]
    );

    const displayedPatients = useMemo(
        () => (searchedPatients !== null ? searchedPatients : patients),
        [patients, searchedPatients]
    );
    const patientRepositoryStats = PatientRepository.getDebugStats();
    const patientNormalizationOptions = useMemo(
        () => ({
            maxSize: DASHBOARD_PATIENT_ENTITY_LIMIT,
            context: 'dashboard-pagination',
        }),
        []
    );
    const memoryGuards = useMemo(
        () => [
            {
                label: 'dashboard.patientEntities',
                value: normalizedPatients.allIds.length,
                threshold: DASHBOARD_PATIENT_ENTITY_LIMIT,
            },
            {
                label: 'repository.patientCache',
                value: patientRepositoryStats.cacheSize,
                threshold: Math.floor(DASHBOARD_PATIENT_ENTITY_LIMIT * 0.8),
            },
        ],
        [normalizedPatients.allIds.length, patientRepositoryStats.cacheSize]
    );

    useMemoryDiagnostics({
        scope: 'dashboard',
        guards: memoryGuards,
        intervalMs: 45_000,
        heapWarnMb: 180,
    });

    const fetchPatients = useCallback(async (after?: string) => {
        if (!doctorId) return;

        if (after) setIsFetchingMore(true);
        else setIsLoading(true);

        try {
            const response = await PatientRepository.getPatients(after);
            const newPatients = Array.isArray(response.patients) ? response.patients : [];
            const nextPatientsState = after
                ? mergeNormalizedPatients(normalizedPatientsRef.current, newPatients, patientNormalizationOptions)
                : normalizePatients(newPatients, patientNormalizationOptions);

            normalizedPatientsRef.current = nextPatientsState;
            setNormalizedPatients(nextPatientsState);

            const reachedEntityCap =
                nextPatientsState.allIds.length >= patientNormalizationOptions.maxSize &&
                Boolean(response.after);
            if (__DEV__ && reachedEntityCap && !hasWarnedPatientCapRef.current) {
                hasWarnedPatientCapRef.current = true;
                console.warn(
                    `[Dashboard] Patient entity store reached cap (${nextPatientsState.allIds.length}). Pagination accumulation is now bounded.`
                );
            }

            setAfterCursor(reachedEntityCap ? null : response.after);
            setHasMorePatients(reachedEntityCap ? false : !!response.after);
        } catch (e) {
            if (__DEV__) console.error('Failed to fetch patients:', e);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [doctorId, patientNormalizationOptions]);

    const fetchAppointments = useCallback(async (date: Date) => {
        if (!doctorId) return;

        setIsLoading(true);
        try {
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const timestamp = Math.floor(dateOnly.getTime() / 1000);

            if (__DEV__) console.log('Fetching appointments for:', dateOnly.toISOString(), 'Timestamp:', timestamp);

            const data = await AppointmentRepository.getAppointments(timestamp);

            const mappedAppointments: Appointment[] = data.map((apt) => {
                const aptDate = new Date(apt.apt_timestamp * 1000);
                const timeString = aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const status: Appointment['status'] = apt.is_consulted ? 'completed' : 'scheduled';
                const patientName = apt.patient?.patient_name || 'Unknown Patient';
                const patientMobile = apt.patient?.patient_mobile || '';

                return {
                    id: apt._id,
                    patientId: apt.patient?._id || apt.patient_id || apt._id,
                    patientName,
                    patientMobile,
                    status,
                    time: timeString,
                    timestamp: apt.apt_timestamp,
                    type: apt.reason_to_visit || 'Consultation',
                    isConsulted: apt.is_consulted,
                };
            }).sort((a, b) => b.timestamp - a.timestamp);

            setAppointments(mappedAppointments);
        } catch (e) {
            if (__DEV__) console.error('Failed to fetch appointments:', e);
        } finally {
            setIsLoading(false);
        }
    }, [doctorId]);

    const handlePatientSearch = useCallback((text: string) => {
        const requestId = ++searchRequestIdRef.current;
        setSearchQuery(text);
        if (!text.trim()) {
            setSearchedPatients(null); // Clear search results immediately
            return;
        }
        if (!doctorId) return;

        void PatientRepository.searchPatients(text, DASHBOARD_SEARCH_DEBOUNCE_MS)
            .then((results) => {
                if (requestId !== searchRequestIdRef.current) return;
                setSearchedPatients(results);
            })
            .catch((e) => {
                if (requestId !== searchRequestIdRef.current) return;
                if (__DEV__) console.error('Search failed:', e);
                setSearchedPatients([]);
            });
    }, [doctorId]);

    const handleLoadMorePatients = useCallback(() => {
        if (__DEV__) {
            console.log(`[Dashboard] onEndReached triggered. hasMore: ${hasMorePatients}, fetchingMore: ${isFetchingMore}, loading: ${isLoading}, isSearch: ${searchedPatients !== null}`);
        }

        if (onEndReachedCalledDuringMomentum.current) return;
        if (!hasMorePatients || isFetchingMore || isLoading || searchedPatients !== null) return;

        if (__DEV__) console.log(`[Dashboard] Loading more patients with cursor: ${afterCursor}`);

        onEndReachedCalledDuringMomentum.current = true;
        fetchPatients(afterCursor || undefined);
    }, [afterCursor, fetchPatients, hasMorePatients, isFetchingMore, isLoading, searchedPatients]);

    const handleRefreshPatients = useCallback(() => {
        setAfterCursor(null);
        setHasMorePatients(true);
        fetchPatients();
    }, [fetchPatients]);

    const handlePatientsMomentumScrollBegin = useCallback(() => {
        onEndReachedCalledDuringMomentum.current = false;
    }, []);

    const handleAppointmentPress = useCallback((appointment: Appointment) => {
        if (__DEV__) console.log('Opening patient from appointment:', appointment.patientId);
        router.push({
            pathname: '/(app)/patient/[id]',
            params: {
                id: appointment.patientId,
                patientName: appointment.patientName,
                patientMobile: appointment.patientMobile || '',
            },
        });
    }, []);

    const handlePatientPress = useCallback((patient: Patient) => {
        router.push({
            pathname: '/(app)/patient/[id]',
            params: {
                id: patient._id,
                patientName: patient.patient_name,
                patientMobile: patient.patient_mobile,
                patientAge: patient.age != null ? String(patient.age) : '',
                patientGender: patient.gender || '',
            },
        });
    }, []);

    const handleSettingsPress = useCallback(() => {
        router.push('/(app)/settings');
    }, []);

    const handleNewAppointment = useCallback(() => {
        setShowNewAppointmentModal(true);
    }, []);

    const handleCreateAppointment = useCallback(async (patient: { id: string; name: string; mobile: string }, type: string) => {
        if (!doctorId) return;

        setShowNewAppointmentModal(false);

        try {
            const appointmentDate = new Date(selectedDate);
            const now = new Date();
            appointmentDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

            const createdAppointment = await AppointmentRepository.createAppointment({
                patient_id: patient.id,
                appointment_date: Math.floor(appointmentDate.getTime() / 1000),
                appointment_type: type,
                reason_to_visit: 'Consultation',
                appointment_source: 'walkin',
            });

            fetchAppointments(selectedDate);
            router.push({
                pathname: '/(app)/consultation/[patientId]',
                params: {
                    patientId: patient.id,
                    appointmentId: createdAppointment?._id || '',
                    aptTimestamp: String(Math.floor(appointmentDate.getTime() / 1000)),
                },
            });
        } catch (error) {
            if (__DEV__) console.error('Failed to create appointment:', error);
        }
    }, [doctorId, fetchAppointments, selectedDate]);

    const handleOpenRegistration = useCallback((data: { name: string; mobile: string }) => {
        setRegisterInitialData(data);
        setShowRegisterModal(true);
    }, []);

    const handleRegisterSuccess = useCallback(async (patient: { id: string; name: string; mobile: string }) => {
        setShowRegisterModal(false);

        try {
            const appointmentDate = new Date(selectedDate);
            const now = new Date();
            appointmentDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

            const createdAppointment = await AppointmentRepository.createAppointment({
                patient_id: patient.id,
                appointment_date: Math.floor(appointmentDate.getTime() / 1000),
                appointment_type: 'walkin',
                reason_to_visit: 'Consultation',
                appointment_source: 'walkin',
            });

            router.push({
                pathname: '/(app)/consultation/[patientId]',
                params: {
                    patientId: patient.id,
                    appointmentId: createdAppointment?._id || '',
                    aptTimestamp: String(Math.floor(appointmentDate.getTime() / 1000)),
                },
            });
        } catch (error) {
            if (__DEV__) console.error('Failed to create appointment after registration:', error);
            router.push({
                pathname: '/(app)/consultation/[patientId]',
                params: { patientId: patient.id },
            });
        }
    }, [selectedDate]);

    const clearAppointmentsSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    const clearPatientsSearch = useCallback(() => {
        handlePatientSearch('');
    }, [handlePatientSearch]);

    const shouldShowFab = useMemo(() => {
        if (activeTab !== 'appointments') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        return selected >= today;
    }, [activeTab, selectedDate]);

    const pendingAppointmentsCount = useMemo(
        () => appointments.filter((a) => !a.isConsulted).length,
        [appointments]
    );

    useEffect(() => {
        return () => {
            searchRequestIdRef.current += 1;
        };
    }, []);

    useEffect(() => {
        if (!doctorId) return;
        fetchAppointments(selectedDate);
    }, [doctorId, fetchAppointments, selectedDate]);

    useEffect(() => {
        if (!doctorId) return;
        fetchPatients();
    }, [doctorId, fetchPatients]);

    return {
        width,
        isWeb,
        isLargeScreen,
        isMediumScreen,
        activeTab,
        setActiveTab,
        user,
        selectedDate,
        visibleMonth,
        setVisibleMonth,
        handleDateSelect,
        goToToday,
        currentMonth,
        monthDates,
        navigateMonth,
        searchQuery,
        setSearchQuery,
        clearAppointmentsSearch,
        clearPatientsSearch,
        handlePatientSearch,
        appointments,
        filteredAppointments,
        patients,
        displayedPatients,
        isLoading,
        isFetchingMore,
        handleRefreshPatients,
        handleLoadMorePatients,
        handlePatientsMomentumScrollBegin,
        handleAppointmentPress,
        handlePatientPress,
        handleSettingsPress,
        showNewAppointmentModal,
        setShowNewAppointmentModal,
        showRegisterModal,
        setShowRegisterModal,
        registerInitialData,
        handleNewAppointment,
        handleCreateAppointment,
        handleOpenRegistration,
        handleRegisterSuccess,
        shouldShowFab,
        pendingAppointmentsCount,
    };
}
