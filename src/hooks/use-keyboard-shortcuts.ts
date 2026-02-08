import { useEffect } from "react";
import { useEventStore } from "../stores/event-store";
import { useCanvasStore } from "../stores/canvas-store";
import { useUiStore } from "../stores/ui-store";
import { useHistoryStore } from "../stores/history-store";
import { useToastStore } from "../stores/toast-store";
import { useTimelineStore } from "../stores/timeline-store";
import { fitAllEvents } from "../lib/canvas-math";

interface ShortcutOptions {
  onToggleAi?: () => void;
  onNewEvent?: () => void;
}

export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      // Cmd+Z: Undo
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const history = useHistoryStore.getState();
        if (history.canUndo()) {
          history.undo().then(() => {
            const { activeTimelineId } = useTimelineStore.getState();
            if (activeTimelineId) {
              useEventStore.getState().loadEvents(activeTimelineId);
            }
            useCanvasStore.getState().markDirty();
            useToastStore.getState().addToast({ type: "info", title: "Undone" });
          });
        }
        return;
      }

      // Cmd+Shift+Z: Redo
      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const history = useHistoryStore.getState();
        if (history.canRedo()) {
          history.redo().then(() => {
            const { activeTimelineId } = useTimelineStore.getState();
            if (activeTimelineId) {
              useEventStore.getState().loadEvents(activeTimelineId);
            }
            useCanvasStore.getState().markDirty();
            useToastStore.getState().addToast({ type: "info", title: "Redone" });
          });
        }
        return;
      }

      // Delete selected event(s)
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedEventId, selectedEventIds, deleteEvent, bulkDeleteEvents, selectEvent } = useEventStore.getState();
        if (selectedEventIds.size > 0) {
          bulkDeleteEvents(Array.from(selectedEventIds));
          useCanvasStore.getState().markDirty();
          e.preventDefault();
        } else if (selectedEventId) {
          deleteEvent(selectedEventId);
          selectEvent(null);
          useCanvasStore.getState().markDirty();
          e.preventDefault();
        }
      }

      // Escape: deselect
      if (e.key === "Escape") {
        useEventStore.getState().clearSelection();
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

      // Cmd+N: Create new event
      if (meta && e.key === "n") {
        e.preventDefault();
        options.onNewEvent?.();
      }

      // Cmd+D: Duplicate selected event
      if (meta && e.key === "d") {
        e.preventDefault();
        const { selectedEventId, events, createEvent } = useEventStore.getState();
        if (selectedEventId) {
          const event = events.find((ev) => ev.id === selectedEventId);
          if (event) {
            createEvent({
              timelineId: event.timelineId,
              trackId: event.trackId,
              title: `${event.title} (copy)`,
              description: event.description || undefined,
              startDate: event.startDate,
              endDate: event.endDate || undefined,
              eventType: event.eventType,
              importance: event.importance,
              color: event.color || undefined,
              icon: event.icon || undefined,
              tags: event.tags || undefined,
              source: event.source || undefined,
            }).then(() => {
              useCanvasStore.getState().markDirty();
            });
          }
        }
      }

      // Space: Toggle AI panel
      if (e.key === " " && !meta && !e.shiftKey) {
        e.preventDefault();
        options.onToggleAi?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [options]);
}
