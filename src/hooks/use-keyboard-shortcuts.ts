import { useEffect } from "react";
import { useEventStore } from "../stores/event-store";
import { useCanvasStore } from "../stores/canvas-store";
import { useUiStore } from "../stores/ui-store";
import { fitAllEvents } from "../lib/canvas-math";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      // Skip if in an input/textarea
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      // Delete selected event
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedEventId, deleteEvent, selectEvent } = useEventStore.getState();
        if (selectedEventId) {
          deleteEvent(selectedEventId);
          selectEvent(null);
          useCanvasStore.getState().markDirty();
          e.preventDefault();
        }
      }

      // Escape: deselect
      if (e.key === "Escape") {
        useEventStore.getState().selectEvent(null);
        useUiStore.getState().closeModal();
        useCanvasStore.getState().markDirty();
      }

      // Cmd+0: Fit all
      if (meta && e.key === "0") {
        e.preventDefault();
        const events = useEventStore.getState().events;
        const { viewportWidth } = useCanvasStore.getState();
        if (viewportWidth > 0) {
          const { zoom, panOffsetX } = fitAllEvents(events, viewportWidth);
          useCanvasStore.getState().setZoom(zoom);
          useCanvasStore.getState().setPan(panOffsetX, 0);
        }
      }

      // Cmd+=: Zoom in
      if (meta && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        const s = useCanvasStore.getState();
        s.zoomAtPoint(100, s.viewportWidth / 2);
      }

      // Cmd+-: Zoom out
      if (meta && e.key === "-") {
        e.preventDefault();
        const s = useCanvasStore.getState();
        s.zoomAtPoint(-100, s.viewportWidth / 2);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
