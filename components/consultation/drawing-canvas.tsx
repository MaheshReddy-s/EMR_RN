import { Canvas, Group, Path, Skia, SkPath } from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import PrescriptionRowLayout, { API_REFERENCE_WIDTH, FIXED_CONTENT_WIDTH } from './prescription-row-layout';
import { MAX_STROKES_PER_ITEM } from '@/hooks/useConsultation';

// Logical width for device-independent coordinate system (matches backend PencilKit reference)
const LOGICAL_WIDTH = API_REFERENCE_WIDTH;

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
    style,
}: DrawingCanvasProps) {
    const [paths, setPaths] = useState<SkPath[]>([]);
    const [pathColors, setPathColors] = useState<string[]>([]);
    const [pathWidths, setPathWidths] = useState<number[]>([]);
    const [currentPath, setCurrentPath] = useState<SkPath | null>(null);

    const pathRef = useRef<SkPath | null>(null);
    const isDrawing = useRef(false);
    const localCanvasRef = useRef<View>(null);
    const hasUserDrawn = useRef(false);
    const [canvasWidth, setCanvasWidth] = useState<number>(0);

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

        const referenceWidth = prescription?.referenceWidth || LOGICAL_WIDTH;

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
        initialLoadDone.current = false;
        hasUserDrawn.current = false;
        setPaths([]);
        setPathColors([]);
        setPathWidths([]);
    }, [prescription?.id]);

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
        // Native check: stylusData is the most reliable check for Apple Pencil / Stylus
        return !!e.stylusData;
    }, []);

    const drawingGesture = useMemo(() => Gesture.Pan()
        .minDistance(1)
        .runOnJS(true)
        .onStart((e) => {
            if (!isStylusInput(e)) {
                isDrawing.current = false;
                return;
            }

            isDrawing.current = true;
            const newPath = Skia.Path.Make();
            if (newPath) {
                // Convert screen coordinates to logical coordinates
                const logicalX = e.x / displayScale;
                const logicalY = e.y / displayScale;
                newPath.moveTo(logicalX, logicalY);
                pathRef.current = newPath;
                setCurrentPath(newPath);
            }
        })
        .onUpdate((e) => {
            if (!isDrawing.current || !pathRef.current) return;

            // Convert screen coordinates to logical coordinates
            const logicalX = e.x / displayScale;
            const logicalY = e.y / displayScale;
            pathRef.current.lineTo(logicalX, logicalY);

            // Trigger re-render with a copy of the current path
            setCurrentPath(pathRef.current.copy());
        })
        .onEnd(() => {
            if (!isDrawing.current || !pathRef.current) return;

            const svgString = pathRef.current.toSVGString();
            if (svgString) {
                const finalPath = Skia.Path.MakeFromSVGString(svgString);
                if (finalPath) {
                    hasUserDrawn.current = true;
                    setPaths(prev => [...prev, finalPath]);
                    setPathColors(prev => [...prev, isErasing ? '#FFFFFF' : penColor]);
                    setPathWidths(prev => [...prev, isErasing ? ERASER_WIDTH : penThickness]);
                }
            }

            isDrawing.current = false;
            pathRef.current = null;
            setCurrentPath(null);
        }),
        [isErasing, penColor, penThickness, isStylusInput, displayScale]);

    const handleClear = useCallback(() => {
        setPaths([]);
        setPathColors([]);
        setPathWidths([]);
        hasUserDrawn.current = true;
    }, []);

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
                        {currentPath && (
                            <Path
                                path={currentPath}
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
    ), [paths, pathColors, pathWidths, currentPath, isErasing, penColor, penThickness, canvasWidth, drawingGesture, handleCanvasLayout, effectiveCanvasRef, style, prescription?.id]);

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
