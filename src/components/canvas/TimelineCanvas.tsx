import { useRef, useEffect, useCallback } from "react";
import { useCanvas } from "../../hooks/use-canvas";
import { useZoomPan } from "../../hooks/use-zoom-pan";
import { useCanvasStore } from "../../stores/canvas-store";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { fitAllEvents } from "../../lib/canvas-math";

export function TimelineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useCanvas(canvasRef);
  useZoomPan(canvasRef);

  const events = useEventStore((s) => s.events);
  const tracks = useTrackStore((s) => s.tracks);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const markDirty = useCanvasStore((s) => s.markDirty);

  // Re-render when data changes
  useEffect(() => {
    markDirty();
  }, [events, tracks, markDirty]);

  // Fit all on first load
  const hasFitted = useRef(false);
  useEffect(() => {
    if (events.length > 0 && !hasFitted.current) {
      hasFitted.current = true;
      const { viewportWidth } = useCanvasStore.getState();
      if (viewportWidth > 0) {
        const { zoom, panOffsetX } = fitAllEvents(events, viewportWidth);
        useCanvasStore.getState().setZoom(zoom);
        useCanvasStore.getState().setPan(panOffsetX, 0);
      }
    }
  }, [events]);

  // Click to select event
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const eventId = rendererRef.current.hitTest(x, y);
      selectEvent(eventId);
      if (eventId) {
        // Open detail panel
        const { useUiStore } = require("../../stores/ui-store");
        const uiState = useUiStore.getState();
        if (uiState.detailPanelCollapsed) {
          uiState.toggleDetailPanel();
        }
      }
      markDirty();
    },
    [selectEvent, markDirty, rendererRef]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onClick={handleClick}
    />
  );
}
