import { Canvas, Path, Skia, SkPath } from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import PrescriptionRowLayout, { API_REFERENCE_WIDTH, FIXED_CONTENT_WIDTH } from './prescription-row-layout';
import { MAX_STROKES_PER_ITEM } from '@/hooks/useConsultation';

// Local logical width for saving new drawings (matches layout)
const LOGICAL_WIDTH = FIXED_CONTENT_WIDTH;

const DEFAULT_PEN_COLOR = '#5d271aff';
const DEFAULT_PEN_WIDTH = 1.5; // Default thickness for backend drawings
const ERASER_WIDTH = 20; // Thicker stroke for eraser

// Re-export StrokeData from centralized entity types for backward compatibility
export type { StrokeData } from '@/entities/consultation/types';
import type { StrokeData } from '@/entities/consultation/types';

interface Stroke {
    path: SkPath;
    color: string;
    width: number;
    blendMode: 'clear' | 'srcOver';
}

interface DrawingCanvasProps {
    index?: number;
    prescription?: any;
    onExpand?: () => void;
    onDelete?: () => void;
    onStrokesChange?: (strokes: StrokeData[]) => void;
    canvasRef?: React.RefObject<View | null>;
    initialDrawings?: StrokeData[];
    penColor: string;
    penThickness: number;
    isErasing: boolean;
    onEdit?: () => void;
    showIndex?: boolean;
    canvasOnly?: boolean;
    isFullWidth?: boolean;
    onDrawingActive?: (active: boolean) => void;
    style?: any;
}

// Memoize the layout component to prevent re-renders when drawing
const StandardRowLayout = React.memo(PrescriptionRowLayout);

function DrawingCanvasComponent({
    index,
    prescription,
    onExpand,
    onDelete,
    onStrokesChange,
    canvasRef,
    initialDrawings,
    penColor,
    penThickness,
    isErasing,
    onEdit,
    showIndex = false,
    canvasOnly = false,
    isFullWidth = false,
    onDrawingActive,
    style,
}: DrawingCanvasProps) {
    // ─── PERF FIX (Issue 2): Store strokes in ref, only commit to state on stroke end ───
    const strokesRef = useRef<Stroke[]>([]);
    const [strokesVersion, setStrokesVersion] = useState(0); // Trigger render only on commit
    const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
    const pathRef = useRef<SkPath | null>(null);
    const isDrawing = useRef(false);
    const localCanvasRef = useRef<View>(null);
    const hasUserDrawn = useRef(false);
    const [canvasWidth, setCanvasWidth] = useState<number>(0);

    // Track the canvas's absolute position on screen for accurate coordinate calculation
    const onDrawingActiveRef = useRef(onDrawingActive);
    onDrawingActiveRef.current = onDrawingActive;

    const onStrokesChangeRef = useRef(onStrokesChange);
    onStrokesChangeRef.current = onStrokesChange;

    const eraserAtStartOfStroke = useRef(false);
    const initialLoadDone = useRef(false);

    // Scale factor between logical and screen coordinates (for saving new drawings)
    const displayScale = canvasWidth > 0 ? canvasWidth / LOGICAL_WIDTH : 1;
    const apiDisplayScale = canvasWidth > 0 ? canvasWidth / API_REFERENCE_WIDTH : 1;

    // Load initial drawings - Standardized scaling
    useEffect(() => {
        if (!initialDrawings || initialDrawings.length === 0 || initialLoadDone.current) {
            return;
        }

        const loadedStrokes: Stroke[] = [];

        for (const stroke of initialDrawings) {
            const svgString = stroke.svg;
            try {
                const path = Skia.Path.MakeFromSVGString(svgString);
                if (path) {
                    // Drawings are stored at 720px width logical coordinates
                    // Scale to actual screen width
                    const scale = displayScale;
                    if (scale !== 1) {
                        path.transform(Skia.Matrix().scale(scale, scale));
                    }
                    loadedStrokes.push({
                        path,
                        color: stroke.color,
                        width: stroke.width * scale,
                        blendMode: stroke.blendMode === 'clear' ? 'clear' : 'srcOver'
                    });
                }
            } catch (e) {
                if (__DEV__) console.warn('Failed to parse SVG path:', svgString, e);
            }
        }

        if (loadedStrokes.length > 0) {
            initialLoadDone.current = true;
            hasUserDrawn.current = false;
            strokesRef.current = loadedStrokes;
            setStrokesVersion(v => v + 1);
        }
    }, [initialDrawings, displayScale, prescription?.id]);

    // Handle prescription change (reset state)
    useEffect(() => {
        initialLoadDone.current = false;
        hasUserDrawn.current = false;
        strokesRef.current = [];
        setStrokesVersion(v => v + 1);
    }, [prescription?.id]);

    // Save paths - convert screen coords back to 720px logical coords
    // Only runs when version changes (i.e., stroke end), not during drawing
    useEffect(() => {
        if (!hasUserDrawn.current) return;

        if (onStrokesChangeRef.current && displayScale > 0) {
            const currentStrokes = strokesRef.current;
            const strokeDataArray: StrokeData[] = currentStrokes.map((s) => {
                const svgString = s.path.toSVGString();
                if (!svgString) return null;

                // Scale back to 720px width logical coordinates
                const backScale = 1 / displayScale;
                const scaledSvg = svgString.replace(
                    /([ML])(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g,
                    (_match: string, cmd: string, x: string, y: string) => {
                        const logX = (parseFloat(x) * backScale).toFixed(2);
                        const logY = (parseFloat(y) * backScale).toFixed(2);
                        return `${cmd}${logX} ${logY}`;
                    }
                );

                return {
                    svg: scaledSvg,
                    color: s.color || DEFAULT_PEN_COLOR,
                    width: (s.width || DEFAULT_PEN_WIDTH) * backScale,
                    blendMode: s.blendMode || 'srcOver',
                };
            }).filter(Boolean) as StrokeData[];

            onStrokesChangeRef.current(strokeDataArray);
        }
    }, [strokesVersion, displayScale]);

    const effectiveCanvasRef = canvasRef || localCanvasRef;

    // ─── PERF FIX (Issue 2): Memoize gesture to prevent recreation ───
    const drawingGesture = useMemo(() => Gesture.Pan()
        .minDistance(1)
        .runOnJS(true)
        .onStart((e) => {
            eraserAtStartOfStroke.current = isErasing;
            isDrawing.current = true;
            onDrawingActiveRef.current?.(true);

            const newPath = Skia.Path.Make();
            if (newPath) {
                newPath.moveTo(e.x, e.y);
                pathRef.current = newPath;
                setCurrentPath(newPath);
            }
        })
        .onUpdate((e) => {
            if (!isDrawing.current || !pathRef.current) return;
            pathRef.current.lineTo(e.x, e.y);
            // Create lightweight copy for render — Skia copy() is O(1) reference counted
            setCurrentPath(pathRef.current.copy());
        })
        .onEnd(() => {
            if (!isDrawing.current || !pathRef.current) return;
            isDrawing.current = false;
            onDrawingActiveRef.current?.(false);

            const finalPath = pathRef.current;
            const newStroke: Stroke = {
                path: finalPath,
                color: eraserAtStartOfStroke.current ? '#000000' : penColor,
                width: eraserAtStartOfStroke.current ? ERASER_WIDTH : penThickness,
                blendMode: eraserAtStartOfStroke.current ? 'clear' : 'srcOver'
            };

            // ─── MEMORY CAP (Issue 7): Enforce stroke limit ───
            const currentStrokes = strokesRef.current;
            if (currentStrokes.length >= MAX_STROKES_PER_ITEM) {
                // Drop oldest strokes to stay within cap
                strokesRef.current = [...currentStrokes.slice(-(MAX_STROKES_PER_ITEM - 1)), newStroke];
                if (__DEV__) console.warn(`[DrawingCanvas] Stroke cap reached (${MAX_STROKES_PER_ITEM}), oldest stroke dropped`);
            } else {
                strokesRef.current = [...currentStrokes, newStroke];
            }

            hasUserDrawn.current = true;
            setCurrentPath(null);
            pathRef.current = null;

            // Commit to state (triggers save effect and re-render)
            setStrokesVersion(v => v + 1);
        }),
        [isErasing, penColor, penThickness]); // Only recreate when drawing tools change

    const handleClear = useCallback(() => {
        strokesRef.current = [];
        hasUserDrawn.current = true;
        setStrokesVersion(v => v + 1);
    }, []);

    const handleCanvasLayout = useCallback((event: any) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && Math.abs(canvasWidth - width) > 1) {
            setCanvasWidth(width);
        }
    }, [canvasWidth]);

    // ─── PERF FIX (Issue 6): Read from ref for render, driven by version counter ───
    const strokes = strokesRef.current;

    const renderCanvas = useCallback(() => (
        <GestureDetector gesture={drawingGesture}>
            <View
                style={[styles.canvasContainer, isErasing && styles.canvasErasing, style]}
                onLayout={handleCanvasLayout}
                collapsable={false}
                ref={effectiveCanvasRef}
            >
                <Canvas style={styles.canvas}>
                    {strokes.map((s, i) => (
                        <Path
                            key={`${prescription?.id}-stroke-${i}`}
                            path={s.path}
                            style="stroke"
                            color={s.color}
                            strokeWidth={s.width}
                            blendMode={s.blendMode}
                            strokeCap="round"
                            strokeJoin="round"
                        />
                    ))}
                    {currentPath && (
                        <Path
                            path={currentPath}
                            style="stroke"
                            color={isErasing ? '#000000' : penColor}
                            strokeWidth={isErasing ? ERASER_WIDTH : penThickness}
                            blendMode={isErasing ? 'clear' : 'srcOver'}
                            strokeCap="round"
                            strokeJoin="round"
                        />
                    )}
                </Canvas>
            </View>
        </GestureDetector>
    ), [strokes, currentPath, isErasing, penColor, penThickness, canvasWidth, drawingGesture, handleCanvasLayout, effectiveCanvasRef, style, prescription?.id]);

    if (canvasOnly) {
        return renderCanvas();
    }

    return (
        <StandardRowLayout
            index={index || 0}
            prescription={prescription}
            height={prescription?.height || (isFullWidth ? 60 : 70)}
            renderCanvas={renderCanvas}
            onExpand={onExpand || (() => { })}
            onDelete={onDelete || (() => { })}
            onClear={handleClear}
            onEdit={onEdit}
            canClear={strokes.length > 0}
            showIndex={showIndex}
            isFullWidth={isFullWidth}
        />
    );
}

export const DrawingCanvas = React.memo(DrawingCanvasComponent);
export default DrawingCanvas;

const styles = StyleSheet.create({
    canvasContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    canvas: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    canvasErasing: {
        opacity: 0.8,
    }
});
