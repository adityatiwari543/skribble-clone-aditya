import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "../hooks/useSocket";
import { StrokeData, StrokePoint } from "../types";

interface CanvasProps {
  isDrawer: boolean;
  color: string;
  size: number;
  isEraser: boolean;
  initialStrokes: StrokeData[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

export default function Canvas({ isDrawer, color, size, isEraser, initialStrokes }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const currentStroke = useRef<StrokeData | null>(null);
  const isDrawing = useRef(false);

  const getCtx = useCallback(() => {
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext("2d");
    }
    return ctxRef.current;
  }, []);

  const drawStroke = useCallback((stroke: StrokeData) => {
    const ctx = getCtx();
    if (!ctx || stroke.points.length < 1) return;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = stroke.isEraser ? "#faf6ed" : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const pt of stroke.points.slice(1)) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }, [getCtx]);

  const redrawAll = useCallback((strokes: StrokeData[]) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#faf6ed";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    strokes.forEach(drawStroke);
  }, [drawStroke, getCtx]);

  useEffect(() => {
    redrawAll(initialStrokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onDrawData = (stroke: StrokeData) => {
      drawStroke(stroke);
    };
    const onDrawMove = (payload: { x: number; y: number }) => {
      // Live incremental point for the currently-in-progress stroke (viewer side)
      const ctx = getCtx();
      if (!ctx) return;
      // draw a small dot to approximate live motion between full stroke syncs
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(payload.x, payload.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    };
    const onClear = () => redrawAll([]);
    const onUndo = (payload: { strokes: StrokeData[] }) => {
      redrawAll(payload.strokes);
    };

    socket.on("draw_data", onDrawData);
    socket.on("draw_move", onDrawMove);
    socket.on("canvas_clear", onClear);
    socket.on("draw_undo", onUndo);

    return () => {
      socket.off("draw_data", onDrawData);
      socket.off("draw_move", onDrawMove);
      socket.off("canvas_clear", onClear);
      socket.off("draw_undo", onUndo);
    };
  }, [drawStroke, redrawAll, getCtx, color]);

  function getRelativeCoords(e: React.PointerEvent<HTMLCanvasElement>): StrokePoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) return;
    isDrawing.current = true;
    const pt = getRelativeCoords(e);
    currentStroke.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      color,
      size,
      isEraser,
      points: [pt],
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isDrawing.current || !currentStroke.current) return;
    const pt = getRelativeCoords(e);
    currentStroke.current.points.push(pt);

    // Draw locally immediately for zero-latency feel
    const ctx = getCtx();
    if (ctx && currentStroke.current.points.length > 1) {
      const pts = currentStroke.current.points;
      const prev = pts[pts.length - 2];
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = isEraser ? "#faf6ed" : color;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }

    // Send lightweight incremental point so others see motion live
    getSocket().emit("draw_move", { x: pt.x, y: pt.y, strokeId: currentStroke.current.id });
  }

  function handlePointerUp() {
    if (!isDrawer || !isDrawing.current) return;
    isDrawing.current = false;
    if (currentStroke.current && currentStroke.current.points.length > 0) {
      getSocket().emit("draw_data", currentStroke.current);
    }
    currentStroke.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        width: "100%",
        maxWidth: CANVAS_WIDTH,
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        background: "#faf6ed",
        border: "3px solid var(--ink)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-hard)",
        touchAction: "none",
        cursor: isDrawer ? "crosshair" : "default",
      }}
    />
  );
}
