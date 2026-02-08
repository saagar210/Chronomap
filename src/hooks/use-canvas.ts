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

      // Animate zoom toward target before rendering
      const isAnimating = state.targetZoom !== state.zoomLevel;
      if (isAnimating) {
        state.animateZoom();
      }

      // Re-read state after potential animation update
      const current = isAnimating ? useCanvasStore.getState() : state;
      if (!current.needsRender && !isAnimating) return;

      const dpr = window.devicePixelRatio || 1;
      const width = current.viewportWidth;
      const height = current.viewportHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Only mark clean when zoom animation has stabilized
      const stillAnimating = Math.abs(current.targetZoom - current.zoomLevel) >= 0.001;
      if (!stillAnimating) {
        current.markClean();
      }

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
      const { useSearchStore } = require("../stores/search-store");
      const { useConnectionStore } = require("../stores/connection-store");

      rendererRef.current.render({
        ctx,
        width,
        height,
        dpr,
        zoom: current.zoomLevel,
        panX: current.panOffset.x,
        panY: current.panOffset.y,
        tracks: useTrackStore.getState().tracks,
        events: useEventStore.getState().events,
        connections: useConnectionStore.getState().connections,
        selectedEventId: useEventStore.getState().selectedEventId,
        selectedEventIds: useEventStore.getState().selectedEventIds,
        selectedConnectionId: useConnectionStore.getState().selectedConnectionId,
        highlightedEventIds: useSearchStore.getState().filteredEventIds,
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
