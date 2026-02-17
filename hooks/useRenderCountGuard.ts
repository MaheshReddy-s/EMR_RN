import { useEffect, useRef } from 'react';

export function useRenderCountGuard(
    componentName: string,
    warnEvery = 75
): void {
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;

    useEffect(() => {
        if (!__DEV__) return;
        const count = renderCountRef.current;
        if (count > 0 && count % warnEvery === 0) {
            console.warn(
                `[RenderGuard] ${componentName} rendered ${count} times. Verify memoization and prop stability.`
            );
        }
    });
}

