import { useCallback, useRef } from "react";
import { useCanvasStore } from "../stores/canvas-store";
import { useEventStore } from "../stores/event-store";
import { useUiStore } from "../stores/ui-store";
import { pixelToDate } from "../lib/canvas-math";
import type { CanvasRenderer } from "../components/canvas/CanvasRenderer";

interface DragState {
  active: boolean;
  eventId: string | null;
  startX: number;
  startY: number;
  originalDate: string;
  originalTrackId: string;
}

export function useEventInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  rendererRef: React.RefObject<CanvasRenderer>
) {
  const dragState = useRef<DragState>({
    active: false,
    eventId: null,
    startX: 0,
    startY: 0,
    originalDate: "",
    originalTrackId: "",
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const eventId = rendererRef.current?.hitTest(x, y) ?? null;
      if (eventId) {
        const event = useEventStore.getState().events.find((ev) => ev.id === eventId);
        if (event) {
          dragState.current = {
            active: false, // becomes true on mousemove
            eventId,
            startX: e.clientX,
            startY: e.clientY,
            originalDate: event.startDate,
            originalTrackId: event.trackId,
          };
        }
      }
    },
    [canvasRef, rendererRef]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const ds = dragState.current;
      if (!ds.eventId) return;

      const dx = Math.abs(e.clientX - ds.startX);
      const dy = Math.abs(e.clientY - ds.startY);

      // Only start drag after 5px threshold
      if (!ds.active && (dx > 5 || dy > 5)) {
        ds.active = true;
      }

      if (!ds.active) return;

      // Calculate new date from pixel position
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const { zoomLevel, panOffset } = useCanvasStore.getState();
      const newDate = pixelToDate(x, zoomLevel, panOffset.x);
      const dateStr = newDate.toISOString().split("T")[0];

      // Update event position (optimistic)
      const { events } = useEventStore.getState();
      const event = events.find((ev) => ev.id === ds.eventId);
      if (event) {
        // Check for track change
        const { useTrackStore } = require("../stores/track-store");
        const y = e.clientY - rect.top;
        const newTrackId = rendererRef.current?.getTrackAtY(
          y - panOffset.y,
          useTrackStore.getState().tracks
        );

        useEventStore.getState().updateEvent({
          id: ds.eventId,
          startDate: dateStr,
          ...(newTrackId && newTrackId !== event.trackId ? { trackId: newTrackId } : {}),
        });
      }
    },
    [canvasRef, rendererRef]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current = {
      active: false,
      eventId: null,
      startX: 0,
      startY: 0,
      originalDate: "",
      originalTrackId: "",
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (dragState.current.active) return; // was a drag, not a click

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const eventId = rendererRef.current?.hitTest(x, y) ?? null;
      useEventStore.getState().selectEvent(eventId);

      if (eventId) {
        const uiState = useUiStore.getState();
        if (uiState.detailPanelCollapsed) {
          uiState.toggleDetailPanel();
        }
      }

      useCanvasStore.getState().markDirty();
    },
    [canvasRef, rendererRef]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const eventId = rendererRef.current?.hitTest(x, y) ?? null;
      if (eventId) {
        useEventStore.getState().selectEvent(eventId);
        const uiState = useUiStore.getState();
        if (uiState.detailPanelCollapsed) {
          uiState.toggleDetailPanel();
        }
      }
    },
    [canvasRef, rendererRef]
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick,
    handleDoubleClick,
  };
}
