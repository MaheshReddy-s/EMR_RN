
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FIXED_CONTENT_WIDTH } from './prescription-row-layout';

const LOGICAL_WIDTH = FIXED_CONTENT_WIDTH;
const ERASER_COLOR = '#FFFFFF';
const ERASER_WIDTH = 20;
const DEFAULT_PEN_COLOR = '#1a365d';
const DEFAULT_PEN_WIDTH = 2.5;

interface Point {
    x: number;
    y: number;
}

interface PathData {
    points: Point[];
    color: string;
    width: number;
}

export interface StrokeData {
    svg: string;
    color: string;
    width: number;
}

interface DrawingCanvasProps {
    index: number;
    prescription: any;
    onExpand?: () => void;
    onDelete?: () => void;
    onStrokesChange?: (strokes: StrokeData[]) => void;
    initialDrawings?: StrokeData[];
    penColor: string;
    penThickness: number;
    isErasing: boolean;
    canvasRef?: React.RefObject<any>;
    onEdit?: () => void;
    showIndex?: boolean;
    canvasOnly?: boolean;
}

function pointsToSvgPath(points: Point[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
        return `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}L${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    }
    let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
        path += `L${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
    }
    return path;
}

function svgPathToPoints(svgPath: string): Point[] {
    const points: Point[] = [];
    const regex = /([ML])(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g;
    let match;
    while ((match = regex.exec(svgPath)) !== null) {
        points.push({
            x: parseFloat(match[2]),
            y: parseFloat(match[3])
        });
    }
    return points;
}

export default function DrawingCanvas({
    index,
    prescription,
    onExpand,
    onDelete,
    onStrokesChange,
    initialDrawings,
    penColor,
    penThickness,
    isErasing,
    canvasRef,
    onEdit,
    showIndex = false,
    canvasOnly = false
}: DrawingCanvasProps) {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [displayScale, setDisplayScale] = useState(1);
    const hasUserDrawn = useRef(false);
    const initialLoadDone = useRef(false);
    const onStrokesChangeRef = useRef(onStrokesChange);

    // Keep ref in sync with latest prop without triggering effects
    onStrokesChangeRef.current = onStrokesChange;

    const logicalHeight = prescription?.height || 100;

    useEffect(() => {
        if (!initialDrawings || initialDrawings.length === 0) return;
        if (initialLoadDone.current) return;

        const loadedPaths: PathData[] = [];
        for (const strokeData of initialDrawings) {
            const svgPath = typeof strokeData === 'string' ? strokeData : strokeData.svg;
            const color = typeof strokeData === 'string' ? DEFAULT_PEN_COLOR : (strokeData.color || DEFAULT_PEN_COLOR);
            const width = typeof strokeData === 'string' ? DEFAULT_PEN_WIDTH : (strokeData.width || DEFAULT_PEN_WIDTH);

            if (!svgPath || svgPath.trim() === '') continue;
            try {
                const points = svgPathToPoints(svgPath);
                if (points.length > 0) {
                    loadedPaths.push({ points, color, width });
                }
            } catch (e) { }
        }

        if (loadedPaths.length > 0) {
            initialLoadDone.current = true;
            hasUserDrawn.current = false;
            setPaths(loadedPaths);
        }
    }, [initialDrawings]);

    useEffect(() => {
        if (!hasUserDrawn.current) return;
        if (onStrokesChangeRef.current) {
            const strokeDataArray: StrokeData[] = paths.map(p => ({
                svg: pointsToSvgPath(p.points),
                color: p.color,
                width: p.width
            }));
            onStrokesChangeRef.current(strokeDataArray);
        }
    }, [paths]);

    useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = LOGICAL_WIDTH;
        canvas.height = logicalHeight;
        ctx.clearRect(0, 0, LOGICAL_WIDTH, logicalHeight);

        [...paths, isDrawing ? { points: currentPath, color: isErasing ? ERASER_COLOR : penColor, width: isErasing ? ERASER_WIDTH : penThickness } : null].forEach(pathData => {
            if (!pathData || pathData.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = pathData.color;
            ctx.lineWidth = pathData.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
            for (let i = 1; i < pathData.points.length; i++) {
                ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
            }
            ctx.stroke();
        });
    }, [paths, currentPath, penColor, penThickness, isErasing, logicalHeight, isDrawing]);

    const handleContainerResize = useCallback(() => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            setDisplayScale(containerWidth / LOGICAL_WIDTH);
        }
    }, []);

    useEffect(() => {
        handleContainerResize();
        window.addEventListener('resize', handleContainerResize);
        return () => window.removeEventListener('resize', handleContainerResize);
    }, [handleContainerResize]);

    const getEventPosition = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX; clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) / displayScale,
            y: (clientY - rect.top) / displayScale
        };
    }, [displayScale]);

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const point = getEventPosition(e);
        if (!point) return;
        setIsDrawing(true);
        setCurrentPath([point]);
    }, [getEventPosition]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const point = getEventPosition(e);
        if (!point || !isDrawing) return;
        setCurrentPath(prev => [...prev, point]);
    }, [getEventPosition, isDrawing]);

    const handleEnd = useCallback(() => {
        if (isDrawing && currentPath.length >= 2) {
            hasUserDrawn.current = true;
            setPaths(prev => [...prev, {
                points: [...currentPath],
                color: isErasing ? ERASER_COLOR : penColor,
                width: isErasing ? ERASER_WIDTH : penThickness
            }]);
        }
        setIsDrawing(false);
        setCurrentPath([]);
    }, [isDrawing, currentPath, penColor, penThickness, isErasing]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'absolute' }}>
            <canvas
                ref={internalCanvasRef}
                style={{
                    width: LOGICAL_WIDTH,
                    height: logicalHeight,
                    transform: `scale(${displayScale})`,
                    transformOrigin: 'top left',
                    cursor: 'crosshair',
                    touchAction: 'none'
                }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
            />
        </div>
    );
}
