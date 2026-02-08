import { Pencil, Trash2, Copy, Link, ShieldCheck } from "lucide-react";
import { useEventStore } from "../../stores/event-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { useUiStore } from "../../stores/ui-store";
import { useAiStore } from "../../stores/ai-store";
import { useToastStore } from "../../stores/toast-store";
import * as cmd from "../../lib/commands";

interface ContextMenuProps {
  x: number;
  y: number;
  eventId: string | null;
  onClose: () => void;
  onStartConnect?: (eventId: string) => void;
}

export function ContextMenu({ x, y, eventId, onClose, onStartConnect }: ContextMenuProps) {
  const { events, deleteEvent, selectEvent, createEvent } = useEventStore();
  const event = events.find((e) => e.id === eventId);

  const handleFactCheck = async () => {
    if (!event) return;
    try {
      useAiStore.setState({ loading: true, error: null });
      const result = await cmd.aiFactCheck(
        event.title,
        event.startDate,
        event.description ?? ""
      );
      useAiStore.setState((s) => ({
        messages: [
          ...s.messages,
          { role: "assistant" as const, content: result },
        ],
        loading: false,
      }));
      useToastStore.getState().addToast({
        type: "info",
        title: `Fact check complete for "${event.title}"`,
        description: "Results shown in AI panel",
      });
    } catch (e) {
      useAiStore.setState({ error: String(e), loading: false });
      useToastStore.getState().addToast({
        type: "error",
        title: "Fact check failed",
        description: String(e),
      });
    }
  };

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
          icon: <Link size={14} />,
          label: "Connect to...",
          action: () => {
            onStartConnect?.(eventId);
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
        {
          icon: <ShieldCheck size={14} />,
          label: "Fact Check",
          action: handleFactCheck,
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
            "danger" in item && item.danger ? "text-danger" : "text-text"
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
