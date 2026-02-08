import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "../stores/canvas-store";
import { CanvasRenderer } from "../components/canvas/CanvasRenderer";

export function useCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const rendererRef = useRef(new CanvasRenderer());
  const rafRef = useRef<number>(0);

  const setViewport = useCanvasStore((s) => s.setViewport);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setViewport(width, height);
      }
    });

    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [canvasRef, setViewport]);

  // Render loop
  const startRenderLoop = useCallback(() => {
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const state = useCanvasStore.getState();
      if (!state.needsRender) return;

      const dpr = window.devicePixelRatio || 1;
      const width = state.viewportWidth;
      const height = state.viewportHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      state.markClean();

      // Read theme colors from CSS custom properties
      const style = getComputedStyle(document.documentElement);
      const colors = {
        bg: style.getPropertyValue("--cm-bg").trim() || "#ffffff",
        trackAlt: style.getPropertyValue("--cm-canvas-track-alt").trim() || "#f8fafc",
        grid: style.getPropertyValue("--cm-canvas-grid").trim() || "#e2e8f0",
        text: style.getPropertyValue("--cm-text").trim() || "#0f172a",
        textSecondary: style.getPropertyValue("--cm-text-secondary").trim() || "#475569",
        textMuted: style.getPropertyValue("--cm-text-muted").trim() || "#94a3b8",
        accent: style.getPropertyValue("--cm-accent").trim() || "#3b82f6",
      };

      // Import stores lazily to avoid circular deps
      const { useEventStore } = require("../stores/event-store");
      const { useTrackStore } = require("../stores/track-store");

      rendererRef.current.render({
        ctx,
        width,
        height,
        dpr,
        zoom: state.zoomLevel,
        panX: state.panOffset.x,
        panY: state.panOffset.y,
        tracks: useTrackStore.getState().tracks,
        events: useEventStore.getState().events,
        selectedEventId: useEventStore.getState().selectedEventId,
        highlightedEventIds: null, // Phase 5: search
        colors,
      });
    };

    rafRef.current = requestAnimationFrame(render);
  }, [canvasRef]);

  useEffect(() => {
    startRenderLoop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [startRenderLoop]);

  return rendererRef;
}
