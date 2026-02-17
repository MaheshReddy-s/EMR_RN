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

    // Ref to hold sessionStartTime for timer closure — avoids capturing stale state
    const sessionStartRef = useRef(state.sessionStartTime);
    sessionStartRef.current = state.sessionStartTime;

    // Timer Logic — uses ref to avoid re-subscribing every second
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const updateTimer = () => {
            const diff = Date.now() - sessionStartRef.current;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            dispatch({
                type: 'UPDATE_TIMER',
                time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            });
        };

        const startTimer = () => {
            if (interval) return;
            updateTimer();
            interval = setInterval(updateTimer, 1000);
        };

        const stopTimer = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                startTimer();
            } else {
                stopTimer();
            }
        });

        startTimer();

        return () => {
            stopTimer();
            subscription.remove();
        };
    }, []); // Empty deps — sessionStartRef avoids stale closure

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

    const restoreDraft = useCallback((draft: Partial<ConsultationState>) =>
        dispatch({ type: 'RESTORE_DRAFT', draft }), []);

    return {
        state,
        addItem,
        removeItem,
        updateItem,
        setStrokes,
        clearSection,
        restoreDraft
    };
}
