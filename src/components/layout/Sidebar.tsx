import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUiStore } from "../../stores/ui-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { ResizeHandle } from "./ResizeHandle";
import { TrackManager } from "../tracks/TrackManager";
import { IconButton } from "../common/IconButton";
import { EmptyState } from "../common/EmptyState";

export function Sidebar() {
  const { sidebarWidth, sidebarCollapsed, setSidebarWidth, toggleSidebar } =
    useUiStore();
  const { activeTimelineId } = useTimelineStore();

  return (
    <div className="flex flex-shrink-0 h-full">
      <div
        className="border-r border-border bg-bg-secondary flex flex-col overflow-hidden"
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
      >
        {!sidebarCollapsed && (
          <>
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Tracks
              </span>
              <IconButton tooltip="Collapse sidebar" onClick={toggleSidebar}>
                <ChevronLeft size={14} />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTimelineId ? (
                <TrackManager />
              ) : (
                <EmptyState
                  title="No timeline"
                  description="Select or create a timeline to manage tracks"
                />
              )}
            </div>
          </>
        )}
      </div>
      {sidebarCollapsed ? (
        <div className="flex items-start pt-2">
          <IconButton tooltip="Expand sidebar" onClick={toggleSidebar}>
            <ChevronRight size={14} />
          </IconButton>
        </div>
      ) : (
        <ResizeHandle
          side="left"
          onResize={(delta) =>
            setSidebarWidth(Math.max(160, Math.min(400, sidebarWidth + delta)))
          }
        />
      )}
    </div>
  );
}
