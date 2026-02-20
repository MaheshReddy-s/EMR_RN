import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ConsultationItem, StrokeData, ConsultationState, TabType } from '@/entities/consultation/types';

// Re-export for backward compatibility
export type { TabType, ConsultationState } from '@/entities/consultation/types';

// ─── CONFIGURATION ───────────────────────────────────────────
/** Maximum strokes per consultation item (prevents unbounded memory growth) */
export const MAX_STROKES_PER_ITEM = 500;

/** Maximum items per section (prevents unbounded list growth in 10h sessions) */
export const MAX_ITEMS_PER_SECTION = 200;

type Action =
    | { type: 'ADD_ITEM'; section: TabType; item: ConsultationItem }
    | { type: 'REMOVE_ITEM'; section: TabType; id: string }
    | { type: 'UPDATE_ITEM'; section: TabType; id: string; changes: Partial<ConsultationItem> }
    | { type: 'SET_STROKES'; section: TabType; id: string; strokes: StrokeData[] }
    | { type: 'CLEAR_SECTION'; section: TabType }
    | { type: 'CLEAR_ITEM_DRAWINGS'; section: TabType; id: string }
    | { type: 'UPDATE_TIMER'; time: string }
    | { type: 'RESET_SESSION' }
    | { type: 'RESTORE_DRAFT'; draft: Partial<ConsultationState> };

const initialState: ConsultationState = {
    complaints: [],
    diagnosis: [],
    examination: [],
    investigation: [],
    procedure: [],
    prescriptions: [],
    instruction: [],
    notes: [],
    sessionStartTime: Date.now(),
    elapsedTime: '00:00:00',
};

// ─── SECTION KEYS (for iteration) ───────────────────────────
export const SECTION_KEYS: TabType[] = [
    'complaints', 'diagnosis', 'examination', 'investigation',
    'procedure', 'prescriptions', 'instruction', 'notes',
];

function formatElapsedTime(elapsedMs: number): string {
    const safeElapsed = Math.max(0, elapsedMs);
    const hours = Math.floor(safeElapsed / 3_600_000);
    const minutes = Math.floor((safeElapsed % 3_600_000) / 60_000);
    const seconds = Math.floor((safeElapsed % 60_000) / 1_000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ─── REDUCER ─────────────────────────────────────────────────
function consultationReducer(state: ConsultationState, action: Action): ConsultationState {
    switch (action.type) {
        case 'ADD_ITEM': {
            const list = state[action.section] as ConsultationItem[];
            // Cap check
            if (list.length >= MAX_ITEMS_PER_SECTION) {
                if (__DEV__) console.warn(`[useConsultation] Section '${action.section}' hit ${MAX_ITEMS_PER_SECTION} item cap.`);
                return state;
            }
            // Prevent duplicates for non-prescription sections
            if (action.section !== 'prescriptions') {
                if (list.some(i => i.name === action.item.name)) return state;
            }
            return { ...state, [action.section]: [...list, action.item] };
        }
        case 'REMOVE_ITEM':
            return {
                ...state,
                [action.section]: (state[action.section] as ConsultationItem[]).filter(i => i.id !== action.id)
            };
        case 'UPDATE_ITEM':
            return {
                ...state,
                [action.section]: (state[action.section] as ConsultationItem[]).map(i =>
                    i.id === action.id ? { ...i, ...action.changes } : i
                )
            };
        case 'SET_STROKES': {
            // Cap strokes to prevent memory blow-up from heavy drawing sessions
            const cappedStrokes = action.strokes.length > MAX_STROKES_PER_ITEM
                ? action.strokes.slice(-MAX_STROKES_PER_ITEM) // Keep newest strokes
                : action.strokes;

            if (__DEV__ && action.strokes.length > MAX_STROKES_PER_ITEM) {
                console.warn(`[useConsultation] Strokes capped at ${MAX_STROKES_PER_ITEM} for item ${action.id}`);
            }

            return {
                ...state,
                [action.section]: (state[action.section] as ConsultationItem[]).map(i =>
                    i.id === action.id ? { ...i, drawings: cappedStrokes } : i
                )
            };
        }
        case 'CLEAR_SECTION':
            return { ...state, [action.section]: [] };
        case 'CLEAR_ITEM_DRAWINGS':
            return {
                ...state,
                [action.section]: (state[action.section] as ConsultationItem[]).map(i =>
                    i.id === action.id ? { ...i, drawings: [], height: undefined } : i
                )
            };
        case 'UPDATE_TIMER':
            return { ...state, elapsedTime: action.time };
        case 'RESET_SESSION':
            return { ...initialState, sessionStartTime: Date.now() };
        case 'RESTORE_DRAFT':
            return { ...state, ...action.draft };
        default:
            return state;
    }
}

// ─── HOOK ────────────────────────────────────────────────────
export function useConsultation() {
    const [state, dispatch] = useReducer(consultationReducer, initialState);

    // Keep latest session start timestamp outside closures.
    const sessionStartRef = useRef(state.sessionStartTime);
    sessionStartRef.current = state.sessionStartTime;
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isTimerRunningRef = useRef(false);

    const updateTimer = useCallback(() => {
        dispatch({
            type: 'UPDATE_TIMER',
            time: formatElapsedTime(Date.now() - sessionStartRef.current),
        });
    }, []);

    const stopTimer = useCallback(() => {
        isTimerRunningRef.current = false;
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        if (isTimerRunningRef.current && timerIntervalRef.current) return;

        isTimerRunningRef.current = true;
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        updateTimer();
        timerIntervalRef.current = setInterval(updateTimer, 1000);
    }, [updateTimer]);

    const resetSession = useCallback(() => {
        const now = Date.now();
        sessionStartRef.current = now;
        dispatch({ type: 'RESET_SESSION' });
        dispatch({ type: 'UPDATE_TIMER', time: '00:00:00' });
    }, []);

    // Pause interval when app is backgrounded. Resume only if timer is marked running.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                if (isTimerRunningRef.current && !timerIntervalRef.current) {
                    updateTimer();
                    timerIntervalRef.current = setInterval(updateTimer, 1000);
                }
                return;
            }

            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        });

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            isTimerRunningRef.current = false;
            subscription.remove();
        };
    }, [updateTimer]);

    // ─── Stable action callbacks (useCallback prevents child re-renders) ───
    const addItem = useCallback((section: TabType, item: ConsultationItem) =>
        dispatch({ type: 'ADD_ITEM', section, item }), []);

    const removeItem = useCallback((section: TabType, id: string) =>
        dispatch({ type: 'REMOVE_ITEM', section, id }), []);

    const updateItem = useCallback((section: TabType, id: string, changes: Partial<ConsultationItem>) =>
        dispatch({ type: 'UPDATE_ITEM', section, id, changes }), []);

    const setStrokes = useCallback((section: TabType, id: string, strokes: StrokeData[]) =>
        dispatch({ type: 'SET_STROKES', section, id, strokes }), []);

    const clearSection = useCallback((section: TabType) =>
        dispatch({ type: 'CLEAR_SECTION', section }), []);

    const clearItemDrawings = useCallback((section: TabType, id: string) =>
        dispatch({ type: 'CLEAR_ITEM_DRAWINGS', section, id }), []);

    const restoreDraft = useCallback((draft: Partial<ConsultationState>) =>
        dispatch({ type: 'RESTORE_DRAFT', draft }), []);

    return {
        state,
        startTimer,
        stopTimer,
        resetSession,
        addItem,
        removeItem,
        updateItem,
        setStrokes,
        clearSection,
        clearItemDrawings,
        restoreDraft
    };
}
