import { Pencil, Trash2, Copy } from "lucide-react";
import { useEventStore } from "../../stores/event-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { useUiStore } from "../../stores/ui-store";


interface ContextMenuProps {
  x: number;
  y: number;
  eventId: string | null;
  onClose: () => void;
}

export function ContextMenu({ x, y, eventId, onClose }: ContextMenuProps) {
  const { events, deleteEvent, selectEvent, createEvent } = useEventStore();
  const event = events.find((e) => e.id === eventId);

  const items = eventId && event
    ? [
        {
          icon: <Pencil size={14} />,
          label: "Edit",
          action: () => {
            selectEvent(eventId);
            const uiState = useUiStore.getState();
            if (uiState.detailPanelCollapsed) uiState.toggleDetailPanel();
          },
        },
        {
          icon: <Copy size={14} />,
          label: "Duplicate",
          action: async () => {
            await createEvent({
              timelineId: event.timelineId,
              trackId: event.trackId,
              title: `${event.title} (copy)`,
              description: event.description,
              startDate: event.startDate,
              endDate: event.endDate ?? undefined,
              eventType: event.eventType,
              importance: event.importance,
              color: event.color ?? undefined,
              tags: event.tags,
            });
            useCanvasStore.getState().markDirty();
          },
        },
        {
          icon: <Trash2 size={14} />,
          label: "Delete",
          action: () => {
            deleteEvent(eventId);
            selectEvent(null);
            useCanvasStore.getState().markDirty();
          },
          danger: true,
        },
      ]
    : [];

  if (items.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-bg border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          className={`w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-bg-tertiary cursor-pointer ${
            item.danger ? "text-danger" : "text-text"
          }`}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
