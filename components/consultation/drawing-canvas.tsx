import { Canvas, Group, Path, Skia, SkPath } from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import PrescriptionRowLayout, {
    API_REFERENCE_WIDTH,
    NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT,
    NON_PRESCRIPTION_NOTES_DEFAULT_ROW_HEIGHT,
    PRESCRIPTION_DEFAULT_ROW_HEIGHT,
    PRESCRIPTION_WITH_ROW_2_DEFAULT_ROW_HEIGHT
} from './prescription-row-layout';
import type { StrokeData as ConsultationStrokeData } from '@/entities/consultation/types';

// Logical width for device-independent coordinate system (matches backend PencilKit reference)
const LOGICAL_WIDTH = API_REFERENCE_WIDTH;

const DEFAULT_PEN_COLOR = '#5d271aff';
const DEFAULT_PEN_WIDTH = 1.5; // Default thickness for backend drawings
const ERASER_WIDTH = 20; // Thicker stroke for eraser
const STYLUS_POINTER_TYPE = 1; // react-native-gesture-handler PointerType.STYLUS

// Re-export StrokeData from centralized entity types for backward compatibility
export type StrokeData = ConsultationStrokeData;

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
    onClear?: () => void;
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
    onClear,
    showIndex = false,
    canvasOnly = false,
    isFullWidth = false,
    onDrawingActive,
    style,
}: DrawingCanvasProps) {
    const [paths, setPaths] = useState<SkPath[]>([]);
    const [pathColors, setPathColors] = useState<string[]>([]);
    const [pathWidths, setPathWidths] = useState<number[]>([]);
    const [renderTick, setRenderTick] = useState(0);

    const pathRef = useRef<SkPath | null>(null);
    const currentPathRef = useRef<SkPath | null>(null);
    const isDrawing = useRef(false);
    const drawingActiveRef = useRef(false);
    const localCanvasRef = useRef<View>(null);
    const hasUserDrawn = useRef(false);
    const [canvasWidth, setCanvasWidth] = useState<number>(0);
    const frameUpdatePendingRef = useRef(false);
    const frameRequestRef = useRef<number | null>(null);

    const onStrokesChangeRef = useRef(onStrokesChange);
    onStrokesChangeRef.current = onStrokesChange;

    const initialLoadDone = useRef(false);

    // Scale factors: 
    // We store everything in logical coords (0-820) and scale for display 
    const effectiveLogicalWidth = prescription?.referenceWidth || LOGICAL_WIDTH;
    const displayScale = canvasWidth > 0 ? canvasWidth / effectiveLogicalWidth : 1;

    // Load initial drawings from API
    useEffect(() => {
        if (!initialDrawings || initialDrawings.length === 0) return;
        if (canvasWidth <= 0) return;
        if (initialLoadDone.current) return;

        const loadedPaths: SkPath[] = [];
        const loadedColors: string[] = [];
        const loadedWidths: number[] = [];

        for (const stroke of initialDrawings) {
            const svgString = typeof stroke === 'string' ? stroke : stroke.svg;
            if (!svgString) continue;

            try {
                // Load path in logical coords directly (no regex scaling needed)
                const path = Skia.Path.MakeFromSVGString(svgString);
                if (path) {
                    loadedPaths.push(path);
                    loadedColors.push((stroke as any).color || DEFAULT_PEN_COLOR);
                    // Use logical width from API or default
                    loadedWidths.push((stroke as any).width || DEFAULT_PEN_WIDTH);
                }
            } catch (e) {
                if (__DEV__) console.warn('Failed to parse SVG path:', svgString, e);
            }
        }

        if (loadedPaths.length > 0) {
            initialLoadDone.current = true;
            hasUserDrawn.current = false;
            setPaths(loadedPaths);
            setPathColors(loadedColors);
            setPathWidths(loadedWidths);
        }
    }, [initialDrawings, canvasWidth, prescription?.id, prescription?.referenceWidth]);

    // Handle prescription change (reset state)
    useEffect(() => {
        if (frameRequestRef.current !== null) {
            cancelAnimationFrame(frameRequestRef.current);
            frameRequestRef.current = null;
        }
        frameUpdatePendingRef.current = false;
        initialLoadDone.current = false;
        hasUserDrawn.current = false;
        setPaths([]);
        setPathColors([]);
        setPathWidths([]);
        pathRef.current = null;
        currentPathRef.current = null;
        setRenderTick((prev) => prev + 1);
    }, [prescription?.id]);

    useEffect(() => () => {
        if (frameRequestRef.current !== null) {
            cancelAnimationFrame(frameRequestRef.current);
            frameRequestRef.current = null;
        }
    }, []);

    // Save paths - convert screen coords back to 720px logical coords
    useEffect(() => {
        if (!hasUserDrawn.current) return;

        if (onStrokesChangeRef.current && displayScale > 0) {
            const strokeDataArray: StrokeData[] = paths.map((p, i) => {
                const svgString = p.toSVGString();
                if (!svgString) return null;

                return {
                    svg: svgString, // Already logical coords
                    color: pathColors[i] || DEFAULT_PEN_COLOR,
                    width: (pathWidths[i] || DEFAULT_PEN_WIDTH),
                    blendMode: pathColors[i] === '#FFFFFF' ? 'clear' : 'srcOver',
                } as StrokeData;
            }).filter(Boolean) as StrokeData[];

            onStrokesChangeRef.current(strokeDataArray);
        }
    }, [paths, pathColors, pathWidths, displayScale]);

    const effectiveCanvasRef = canvasRef || localCanvasRef;

    const isStylusInput = useCallback((e: any) => {
        if (Platform.OS === 'web') return true;
        // Some callbacks expose pointerType, others only stylusData.
        return e?.pointerType === STYLUS_POINTER_TYPE || !!e?.stylusData;
    }, []);

    const isStylusTouch = useCallback((e: any) => {
        if (Platform.OS === 'web') return true;
        return e?.pointerType === STYLUS_POINTER_TYPE;
    }, []);

    const setDrawingActive = useCallback((active: boolean) => {
        if (drawingActiveRef.current === active) return;
        drawingActiveRef.current = active;
        onDrawingActive?.(active);
    }, [onDrawingActive]);

    useEffect(() => () => {
        setDrawingActive(false);
    }, [setDrawingActive]);

    const scheduleCurrentPathRender = useCallback(() => {
        if (frameUpdatePendingRef.current) return;

        frameUpdatePendingRef.current = true;
        frameRequestRef.current = requestAnimationFrame(() => {
            frameUpdatePendingRef.current = false;
            frameRequestRef.current = null;
            setRenderTick((prev) => prev + 1);
        });
    }, []);

    const beginStrokeAt = useCallback((x: number, y: number) => {
        if (pathRef.current) return;

        const newPath = Skia.Path.Make();
        if (!newPath) return;

        newPath.moveTo(x, y);
        // Tiny starter segment so first touch is visible immediately.
        newPath.lineTo(x + 0.01, y + 0.01);
        pathRef.current = newPath;
        currentPathRef.current = newPath;
        setRenderTick((prev) => prev + 1);
    }, []);

    const drawingGesture = useMemo(() => Gesture.Pan()
        .minDistance(0)
        .runOnJS(true)
        .onTouchesDown((event) => {
            if (!isStylusTouch(event)) {
                isDrawing.current = false;
                return;
            }

            const touch = event.changedTouches?.[0] || event.allTouches?.[0];
            if (!touch) return;

            isDrawing.current = true;
            beginStrokeAt(touch.x / displayScale, touch.y / displayScale);
        })
        .onTouchesMove((event) => {
            if (!isDrawing.current || !pathRef.current || !isStylusTouch(event)) return;

            const touch = event.changedTouches?.[0] || event.allTouches?.[0];
            if (!touch) return;

            pathRef.current.lineTo(touch.x / displayScale, touch.y / displayScale);
            scheduleCurrentPathRender();
        })
        .onBegin((e) => {
            if (!isStylusInput(e)) {
                isDrawing.current = false;
                return;
            }

            isDrawing.current = true;
            const logicalX = e.x / displayScale;
            const logicalY = e.y / displayScale;
            beginStrokeAt(logicalX, logicalY);
        })
        .onStart((e) => {
            if (!isStylusInput(e)) {
                isDrawing.current = false;
                return;
            }

            isDrawing.current = true;
            setDrawingActive(true);
            const logicalX = e.x / displayScale;
            const logicalY = e.y / displayScale;
            beginStrokeAt(logicalX, logicalY);
        })
        .onUpdate((e) => {
            if (!isDrawing.current || !pathRef.current) return;

            // Convert screen coordinates to logical coordinates
            const logicalX = e.x / displayScale;
            const logicalY = e.y / displayScale;
            pathRef.current.lineTo(logicalX, logicalY);

            // Re-render at most once per frame while drawing.
            scheduleCurrentPathRender();
        })
        .onEnd(() => {
            if (!isDrawing.current || !pathRef.current) return;

            if (frameRequestRef.current !== null) {
                cancelAnimationFrame(frameRequestRef.current);
                frameRequestRef.current = null;
            }
            frameUpdatePendingRef.current = false;

            const svgString = pathRef.current.toSVGString();
            const committedPath = pathRef.current.copy();
            if (svgString) {
                hasUserDrawn.current = true;
                setPaths(prev => [...prev, committedPath]);
                setPathColors(prev => [...prev, isErasing ? '#FFFFFF' : penColor]);
                setPathWidths(prev => [...prev, isErasing ? ERASER_WIDTH : penThickness]);
            }

            isDrawing.current = false;
            pathRef.current = null;
            currentPathRef.current = null;
            setRenderTick((prev) => prev + 1);
            setDrawingActive(false);
        })
        .onFinalize(() => {
            if (frameRequestRef.current !== null) {
                cancelAnimationFrame(frameRequestRef.current);
                frameRequestRef.current = null;
            }
            frameUpdatePendingRef.current = false;

            if (isDrawing.current) {
                isDrawing.current = false;
            }
            currentPathRef.current = null;
            setRenderTick((prev) => prev + 1);
            setDrawingActive(false);
        }),
        [isErasing, penColor, penThickness, isStylusInput, isStylusTouch, displayScale, scheduleCurrentPathRender, beginStrokeAt, setDrawingActive]);

    const handleClear = useCallback(() => {
        if (frameRequestRef.current !== null) {
            cancelAnimationFrame(frameRequestRef.current);
            frameRequestRef.current = null;
        }
        frameUpdatePendingRef.current = false;
        pathRef.current = null;
        currentPathRef.current = null;

        setPaths([]);
        setPathColors([]);
        setPathWidths([]);
        setRenderTick((prev) => prev + 1);
        setDrawingActive(false);
        hasUserDrawn.current = true;
        if (onClear) {
            onClear();
        }
    }, [onClear, setDrawingActive]);

    const handleCanvasLayout = useCallback((event: any) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && Math.abs(canvasWidth - width) > 1) {
            setCanvasWidth(width);
        }
    }, [canvasWidth]);

    const renderCanvas = useCallback(() => (
        <GestureDetector gesture={drawingGesture}>
            <View
                style={[styles.canvasContainer, isErasing && styles.canvasErasing, style]}
                onLayout={handleCanvasLayout}
                collapsable={false}
                ref={effectiveCanvasRef}
            >
                <Canvas style={styles.canvas}>
                    <Group transform={[{ scale: displayScale }]}>
                        {paths.map((p, i) => (
                            <Path
                                key={`${prescription?.id}-path-${i}`}
                                path={p}
                                style="stroke"
                                color={pathColors[i]}
                                strokeWidth={pathWidths[i]}
                                blendMode={pathColors[i] === '#FFFFFF' ? 'clear' : 'srcOver'}
                                strokeCap="round"
                                strokeJoin="round"
                            />
                        ))}
                        {currentPathRef.current && (
                            <Path
                                key={`live-path-${renderTick}`}
                                path={currentPathRef.current}
                                style="stroke"
                                color={isErasing ? '#FFFFFF' : penColor}
                                strokeWidth={isErasing ? ERASER_WIDTH : penThickness}
                                blendMode={isErasing ? 'clear' : 'srcOver'}
                                strokeCap="round"
                                strokeJoin="round"
                            />
                        )}
                    </Group>
                </Canvas>
            </View>
        </GestureDetector>
    ), [paths, pathColors, pathWidths, renderTick, isErasing, penColor, penThickness, displayScale, drawingGesture, handleCanvasLayout, effectiveCanvasRef, style, prescription?.id]);

    if (canvasOnly) {
        return renderCanvas();
    }

    const hasDosage = !!(prescription?.dosage && prescription?.dosage !== 'N/A' && !prescription?.dosage.includes('-'));
    const hasInstructions = !!prescription?.instructions;
    const hasRow2 = !isFullWidth && (hasDosage || hasInstructions);
    // Standardize heights to be tight and balanced
    // 26px for single line, 46px for double line.
    const calculatedDefaultHeight = isFullWidth
        ? (prescription?.notes ? NON_PRESCRIPTION_NOTES_DEFAULT_ROW_HEIGHT : NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT)
        : (hasRow2 ? PRESCRIPTION_WITH_ROW_2_DEFAULT_ROW_HEIGHT : PRESCRIPTION_DEFAULT_ROW_HEIGHT);

    return (
        <StandardRowLayout
            index={index || 0}
            prescription={prescription}
            height={prescription?.height || calculatedDefaultHeight}
            renderCanvas={renderCanvas}
            onExpand={onExpand || (() => { })}
            onDelete={onDelete || (() => { })}
            onClear={handleClear}
            onEdit={onEdit}
            canClear={paths.length > 0}
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
