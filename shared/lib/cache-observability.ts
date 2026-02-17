interface CacheMissRateLogger {
    recordHit: () => void;
    recordMiss: () => void;
}

export function createCacheMissRateLogger(
    cacheName: string,
    threshold = 0.85,
    minSamples = 20
): CacheMissRateLogger {
    let hits = 0;
    let misses = 0;
    let warned = false;

    const maybeWarn = () => {
        if (warned || !__DEV__) return;
        const total = hits + misses;
        if (total < minSamples) return;

        const missRate = misses / total;
        if (missRate >= threshold) {
            warned = true;
            console.warn(
                `[Cache][${cacheName}] High miss rate detected: ${(missRate * 100).toFixed(1)}%` +
                ` (${misses}/${total}). Consider cache key/TTL tuning.`
            );
        }
    };

    return {
        recordHit: () => {
            hits += 1;
            maybeWarn();
        },
        recordMiss: () => {
            misses += 1;
            maybeWarn();
        },
    };
}

