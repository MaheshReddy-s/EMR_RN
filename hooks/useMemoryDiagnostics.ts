import { useEffect, useRef } from 'react';

interface MemoryGuard {
    label: string;
    value: number;
    threshold: number;
}

interface UseMemoryDiagnosticsOptions {
    scope: string;
    guards?: MemoryGuard[];
    intervalMs?: number;
    heapWarnMb?: number;
}

export function useMemoryDiagnostics({
    scope,
    guards = [],
    intervalMs = 60_000,
    heapWarnMb = 150,
}: UseMemoryDiagnosticsOptions): void {
    const warnedHeapRef = useRef(false);
    const warnedGuardsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!__DEV__) return;

        const runDiagnostics = () => {
            for (const guard of guards) {
                if (guard.value >= guard.threshold && !warnedGuardsRef.current.has(guard.label)) {
                    warnedGuardsRef.current.add(guard.label);
                    console.warn(
                        `[Memory][${scope}] Guard exceeded: ${guard.label}=${guard.value} (threshold=${guard.threshold})`
                    );
                }
            }

            const performanceAny = globalThis.performance as
                | (Performance & { memory?: { usedJSHeapSize?: number } })
                | undefined;
            const usedHeapBytes = performanceAny?.memory?.usedJSHeapSize;
            if (typeof usedHeapBytes === 'number') {
                const usedMb = Math.round((usedHeapBytes / (1024 * 1024)) * 10) / 10;
                if (usedMb >= heapWarnMb && !warnedHeapRef.current) {
                    warnedHeapRef.current = true;
                    console.warn(
                        `[Memory][${scope}] JS heap is high (${usedMb}MB, threshold=${heapWarnMb}MB).`
                    );
                }
            }
        };

        runDiagnostics();
        const timer = setInterval(runDiagnostics, intervalMs);
        return () => clearInterval(timer);
    }, [guards, heapWarnMb, intervalMs, scope]);
}

