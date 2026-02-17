import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Text } from 'react-native';

/**
 * ConsultationTimer
 * -----------------
 * Shows elapsed time since consultation started.
 *
 * Optimised:
 *  - Uses 250ms interval instead of 30ms to reduce unnecessary re-renders.
 *  - Pauses the timer when the app is in the background (AppState !== 'active').
 *  - Properly cleans up the interval on unmount.
 *  - Tracks "paused" time to keep the displayed elapsed time accurate.
 */

const TICK_INTERVAL_MS = 250;

export default function ConsultationTimer() {
    const [elapsedTime, setElapsedTime] = useState('00:00');
    const startTimeRef = useRef(Date.now());
    const pausedDurationRef = useRef(0);
    const pauseStartRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const tick = useCallback(() => {
        const now = Date.now();
        const totalPaused = pausedDurationRef.current;
        const diff = now - startTimeRef.current - totalPaused;

        const totalSeconds = Math.max(0, Math.floor(diff / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        setElapsedTime(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
    }, []);

    const startInterval = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    }, [tick]);

    const stopInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        startInterval();

        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                // Resume: accumulate paused time
                if (pauseStartRef.current !== null) {
                    pausedDurationRef.current += Date.now() - pauseStartRef.current;
                    pauseStartRef.current = null;
                }
                startInterval();
            } else {
                // Pausing (background/inactive)
                pauseStartRef.current = Date.now();
                stopInterval();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            stopInterval();
            subscription.remove();
        };
    }, [startInterval, stopInterval]);

    return (
        <Text className="text-right text-black font-mono font-bold text-lg mt-2">
            {elapsedTime}
        </Text>
    );
}
