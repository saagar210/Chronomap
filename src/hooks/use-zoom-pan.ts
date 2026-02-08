import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "../stores/canvas-store";

export function useZoomPan(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom
      useCanvasStore.getState().zoomAtPoint(-e.deltaY, x);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll → pan
      useCanvasStore.getState().pan(-e.deltaX, 0);
    } else {
      // Vertical scroll → zoom
      useCanvasStore.getState().zoomAtPoint(-e.deltaY, x);
    }
  }, [canvasRef]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only pan on middle-click or if no event is under cursor (Phase 3 handles click-on-event)
    if (e.button === 1 || (e.button === 0 && !e.shiftKey)) {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    useCanvasStore.getState().pan(dx, dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  return { isPanning };
}
