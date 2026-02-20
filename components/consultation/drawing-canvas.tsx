import { Canvas, Path, Skia, SkPath, notifyChange } from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import PrescriptionRowLayout, {
    API_REFERENCE_WIDTH,
    NON_PRESCRIPTION_DEFAULT_ROW_HEIGHT,
    NON_PRESCRIPTION_NOTES_DEFAULT_ROW_HEIGHT,
    PRESCRIPTION_DEFAULT_ROW_HEIGHT,
    PRESCRIPTION_WITH_ROW_2_DEFAULT_ROW_HEIGHT
} from './prescription-row-layout';
import type { StrokeData as ConsultationStrokeData } from '@/entities/consultation/types';

// Performance architecture remains the same — live on UI thread, commit only on end.

const LOGICAL_WIDTH = API_REFERENCE_WIDTH;
const DEFAULT_PEN_COLOR = '#5d271aff';
const DEFAULT_PEN_WIDTH = 1.5;
const ERASER_COLOR = '#FFFFFF';
const ERASER_WIDTH = 20;
const STYLUS_POINTER_TYPE = 1; // RNGH native mapping: TOUCH=0, STYLUS=1, MOUSE=2

type BlendMode = 'clear' | 'srcOver';

interface RenderStroke {
    id: string;
    path: SkPath;
    color: string;
    width: number; // display-space width
    blendMode: BlendMode;
}

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

const StandardRowLayout = React.memo(PrescriptionRowLayout);

function scaledPathCopy(path: SkPath, scale: number): SkPath {
    const copy = path.copy();
    if (Math.abs(scale - 1) > 1e-6) {
        const matrix = Skia.Matrix();
        matrix.scale(scale, scale);
        copy.transform(matrix);
    }
    return copy;
}

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
    const [strokes, setStrokes] = useState<RenderStroke[]>([]);
    const [canvasWidth, setCanvasWidth] = useState(0);

    const onStrokesChangeRef = useRef(onStrokesChange);
    onStrokesChangeRef.current = onStrokesChange;

    const localCanvasRef = useRef<View>(null);
    const effectiveCanvasRef = canvasRef || localCanvasRef;

    const initialLoadDoneRef = useRef(false);
    const drawingActiveRef = useRef(false);
    const previousScaleRef = useRef(1);
    const clearLiveAfterCommitRef = useRef(false);
    const strokeIdRef = useRef(0);
    const previousInitialCountRef = useRef(initialDrawings?.length ?? 0);
    const serializedStrokesRef = useRef<StrokeData[]>([]);

    const effectiveLogicalWidth = prescription?.referenceWidth || LOGICAL_WIDTH;
    const displayScale = canvasWidth > 0 ? canvasWidth / effectiveLogicalWidth : 1;
    const shouldNotifyDrawingActive = !!onDrawingActive;

    // Shared values — live stroke runs fully on UI thread
    const isDrawing = useSharedValue(false);
    const livePath = useSharedValue<SkPath>(Skia.Path.Make()); // starts empty
    const liveColor = useSharedValue<string>(penColor);
    const liveWidth = useSharedValue<number>(penThickness);
    const liveBlendMode = useSharedValue<BlendMode>('srcOver');

    const setDrawingActive = useCallback((active: boolean) => {
        if (drawingActiveRef.current === active) return;
        drawingActiveRef.current = active;
        onDrawingActive?.(active);
    }, [onDrawingActive]);

    const emitStrokesChange = useCallback((nextStrokes: StrokeData[]) => {
        onStrokesChangeRef.current?.(nextStrokes);
    }, []);

    const resetLiveStroke = useCallback(() => {
        // Only used on unmount / clear — not on every commit
        livePath.value = Skia.Path.Make();
        notifyChange(livePath);
        isDrawing.value = false;
    }, [isDrawing, livePath]);

    // Save each committed stroke once in logical space to avoid O(n) re-serialization per draw.
    const commitStrokeDirect = useCallback((
        path: SkPath,
        color: string,
        width: number,
        blendMode: BlendMode,
        scaleAtCommit: number
    ) => {
        const safeScale = scaleAtCommit > 0 ? scaleAtCommit : 1;
        const logicalPath = safeScale === 1 ? path.copy() : scaledPathCopy(path, 1 / safeScale);
        const svg = logicalPath.toSVGString();
        if (!svg) return;

        clearLiveAfterCommitRef.current = true;
        setStrokes((prev) => [...prev, {
            id: `stroke-${strokeIdRef.current++}`,
            path,
            color,
            width,
            blendMode,
        }]);

        const nextSerialized = serializedStrokesRef.current.concat({
            svg,
            color,
            width: width / safeScale,
            blendMode,
        });
        serializedStrokesRef.current = nextSerialized;
        emitStrokesChange(nextSerialized);
    }, [emitStrokesChange]);

    // Stylus-only input:
    // - pointerType === 1 is stylus in RNGH on native.
    // - stylusData exists for stylus events on iOS/Android.
    // Finger touches are ignored so hand input never draws.
    const drawingGesture = useMemo(() => Gesture.Pan()
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onBegin((e) => {
            const isStylus = e.pointerType === STYLUS_POINTER_TYPE || !!(e as any).stylusData;
            if (!isStylus) return;

            if (shouldNotifyDrawingActive) {
                runOnJS(setDrawingActive)(true);
            }
        })
        .onStart((e) => {
            const isStylus = e.pointerType === STYLUS_POINTER_TYPE || !!(e as any).stylusData;
            if (!isStylus) return;

            const scale = displayScale > 0 ? displayScale : 1;

            // Create NEW path — this replaces / discards the previous livePath atomically
            const newPath = Skia.Path.Make();
            newPath.moveTo(e.x, e.y);
            // Tiny lineTo to avoid zero-length path issues on some devices
            newPath.lineTo(e.x + 0.0001, e.y + 0.0001);

            livePath.value = newPath;
            liveColor.value = isErasing ? ERASER_COLOR : penColor;
            liveBlendMode.value = isErasing ? 'clear' : 'srcOver';
            liveWidth.value = (isErasing ? ERASER_WIDTH : penThickness) * scale;
            isDrawing.value = true;
            notifyChange(livePath);
        })
        .onUpdate((e) => {
            if (!isDrawing.value) return;
            livePath.value.lineTo(e.x, e.y);
            notifyChange(livePath);
        })
        .onEnd(() => {
            if (!isDrawing.value) {
                if (shouldNotifyDrawingActive) {
                    runOnJS(setDrawingActive)(false);
                }
                return;
            }

            // Copy before potential next gesture overwrites it
            const pathCopy = livePath.value.copy();
            runOnJS(commitStrokeDirect)(
                pathCopy,
                liveColor.value,
                liveWidth.value,
                liveBlendMode.value,
                displayScale
            );

            isDrawing.value = false;
            if (shouldNotifyDrawingActive) {
                runOnJS(setDrawingActive)(false);
            }
        })
        .onFinalize(() => {
            if (isDrawing.value) {
                const pathCopy = livePath.value.copy();
                runOnJS(commitStrokeDirect)(
                    pathCopy,
                    liveColor.value,
                    liveWidth.value,
                    liveBlendMode.value,
                    displayScale
                );
            }
            isDrawing.value = false;
            if (shouldNotifyDrawingActive) {
                runOnJS(setDrawingActive)(false);
            }
        }),
        [
            commitStrokeDirect,
            displayScale,
            isDrawing,
            isErasing,
            liveBlendMode,
            liveColor,
            livePath,
            liveWidth,
            penColor,
            penThickness,
            shouldNotifyDrawingActive,
            setDrawingActive,
        ]);

    const handleCanvasLayout = useCallback((event: any) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && Math.abs(canvasWidth - width) > 1) {
            setCanvasWidth(width);
        }
    }, [canvasWidth]);

    const handleClear = useCallback(() => {
        setStrokes([]);
        serializedStrokesRef.current = [];
        emitStrokesChange([]);
        resetLiveStroke(); // now safe — clears live for next draw
        setDrawingActive(false);
        onClear?.();
    }, [emitStrokesChange, onClear, resetLiveStroke, setDrawingActive]);

    useEffect(() => {
        return () => {
            resetLiveStroke();
            setDrawingActive(false);
        };
    }, [resetLiveStroke, setDrawingActive]);

    useEffect(() => {
        if (!clearLiveAfterCommitRef.current) return;
        clearLiveAfterCommitRef.current = false;
        // Hide live stroke after commit without rebuilding path object (reduces end-of-stroke flicker).
        liveWidth.value = 0;
    }, [liveWidth, strokes]);

    useEffect(() => {
        // Sync explicit external clears (parent array transitions non-empty -> empty) without remounting.
        const currentInitialCount = initialDrawings?.length ?? 0;
        const previousInitialCount = previousInitialCountRef.current;
        if (previousInitialCount > 0 && currentInitialCount === 0 && strokes.length > 0) {
            setStrokes([]);
            serializedStrokesRef.current = [];
            resetLiveStroke();
        }
        previousInitialCountRef.current = currentInitialCount;
    }, [initialDrawings, strokes.length, resetLiveStroke]);

    useEffect(() => {
        initialLoadDoneRef.current = false;
        clearLiveAfterCommitRef.current = false;
        strokeIdRef.current = 0;
        previousInitialCountRef.current = 0;
        previousScaleRef.current = 1;
        serializedStrokesRef.current = [];
        setStrokes([]);
        resetLiveStroke();
        setDrawingActive(false);
    }, [prescription?.id, resetLiveStroke, setDrawingActive]);

    // Load initial API strokes (unchanged)
    useEffect(() => {
        if (!initialDrawings || initialDrawings.length === 0) return;
        if (canvasWidth <= 0) return;
        if (initialLoadDoneRef.current) return;

        const loaded: RenderStroke[] = [];
        const loadedSerialized: StrokeData[] = [];

        for (const stroke of initialDrawings) {
            const svg = typeof stroke === 'string' ? stroke : stroke.svg;
            if (!svg) continue;

            try {
                if (!svg || svg === '') continue;
                const logicalPath = Skia.Path.MakeFromSVGString(svg);
                if (!logicalPath) continue;

                const color = (stroke as any)?.color || DEFAULT_PEN_COLOR;
                const logicalWidth = typeof (stroke as any)?.width === 'number'
                    ? (stroke as any).width
                    : DEFAULT_PEN_WIDTH;
                const blendMode: BlendMode = (stroke as any)?.blendMode === 'clear' || color === ERASER_COLOR
                    ? 'clear'
                    : 'srcOver';

                loaded.push({
                    id: `loaded-${strokeIdRef.current++}`,
                    path: scaledPathCopy(logicalPath, displayScale),
                    color,
                    width: logicalWidth * displayScale,
                    blendMode,
                });
                loadedSerialized.push({
                    svg,
                    color,
                    width: logicalWidth,
                    blendMode,
                });
            } catch (error) {
                if (__DEV__) console.warn('Failed to parse SVG path:', svg, error);
            }
        }

        initialLoadDoneRef.current = true;
        previousScaleRef.current = displayScale;
        serializedStrokesRef.current = loadedSerialized;
        setStrokes(loaded);
    }, [initialDrawings, canvasWidth, displayScale]);

    // Rescale on layout change (unchanged)
    useEffect(() => {
        if (displayScale <= 0) return;
        const prev = previousScaleRef.current;
        if (Math.abs(prev - displayScale) < 0.0001) return;

        const ratio = displayScale / prev;
        previousScaleRef.current = displayScale;
        if (!Number.isFinite(ratio) || ratio === 1) return;

        setStrokes((prevStrokes) => prevStrokes.map((stroke) => ({
            ...stroke,
            path: scaledPathCopy(stroke.path, ratio),
            width: stroke.width * ratio,
        })));
    }, [displayScale]);

    const renderCanvas = useCallback(() => (
        <GestureDetector gesture={drawingGesture}>
            <View
                style={[styles.canvasContainer, isErasing && styles.canvasErasing, style]}
                onLayout={handleCanvasLayout}
                collapsable={false}
                ref={effectiveCanvasRef}
            >
                <Canvas style={styles.canvas}>
                    {strokes.map((stroke) => (
                        <Path
                            key={stroke.id}
                            path={stroke.path}
                            style="stroke"
                            color={stroke.color}
                            strokeWidth={stroke.width}
                            blendMode={stroke.blendMode}
                            strokeCap="round"
                            strokeJoin="round"
                        />
                    ))}
                    <Path
                        key="live-stroke"
                        path={livePath}
                        style="stroke"
                        color={liveColor}
                        strokeWidth={liveWidth}
                        blendMode={liveBlendMode}
                        strokeCap="round"
                        strokeJoin="round"
                    />
                </Canvas>
            </View>
        </GestureDetector>
    ), [
        drawingGesture,
        effectiveCanvasRef,
        handleCanvasLayout,
        isErasing,
        liveBlendMode,
        liveColor,
        livePath,
        liveWidth,
        strokes,
        style,
    ]);

    if (canvasOnly) {
        return renderCanvas();
    }

    const hasDosage = !!(prescription?.dosage && prescription?.dosage !== 'N/A' && !prescription?.dosage.includes('-'));
    const hasInstructions = !!prescription?.instructions;
    const hasRow2 = !isFullWidth && (hasDosage || hasInstructions);
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
