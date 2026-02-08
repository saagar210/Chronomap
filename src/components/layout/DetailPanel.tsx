import { useUiStore } from "../../stores/ui-store";
import { useEventStore } from "../../stores/event-store";
import { ResizeHandle } from "./ResizeHandle";
import { EventEditor } from "../events/EventEditor";
import { EmptyState } from "../common/EmptyState";
import { MousePointerClick } from "lucide-react";

export function DetailPanel() {
  const { detailPanelWidth, detailPanelCollapsed, setDetailPanelWidth } =
    useUiStore();
  const { selectedEventId } = useEventStore();

  if (detailPanelCollapsed || !selectedEventId) return null;

  return (
    <div className="flex flex-shrink-0 h-full">
      <ResizeHandle
        side="right"
        onResize={(delta) =>
          setDetailPanelWidth(
            Math.max(240, Math.min(500, detailPanelWidth + delta))
          )
        }
      />
      <div
        className="border-l border-border bg-bg-secondary flex flex-col overflow-hidden"
        style={{ width: detailPanelWidth }}
      >
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Event Details
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedEventId ? (
            <EventEditor eventId={selectedEventId} />
          ) : (
            <EmptyState
              icon={<MousePointerClick size={24} />}
              title="No event selected"
              description="Click an event on the timeline to view and edit its details"
            />
          )}
        </div>
      </div>
    </div>
  );
}
