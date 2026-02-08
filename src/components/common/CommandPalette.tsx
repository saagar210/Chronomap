import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useEventStore } from "../../stores/event-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { useUiStore } from "../../stores/ui-store";
import { useThemeStore } from "../../stores/theme-store";
import { fitAllEvents } from "../../lib/canvas-math";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const events = useEventStore((s) => s.events);
  const timelines = useTimelineStore((s) => s.timelines);
  const activeTimelineId = useTimelineStore((s) => s.activeTimelineId);

  const runAndClose = useCallback((fn: () => void) => {
    fn();
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <Command
        className="relative w-[520px] max-h-[400px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        label="Command Palette"
      >
        <Command.Input
          placeholder="Type a command..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b border-border text-text outline-none placeholder:text-text-muted"
          autoFocus
        />
        <Command.List className="max-h-[320px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-xs text-text-muted">
            No results found.
          </Command.Empty>

          {/* Navigation */}
          <Command.Group heading="Navigation" className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:text-text-muted [&>[cmdk-group-heading]]:font-semibold">
            {events.map((ev) => (
              <Command.Item
                key={ev.id}
                value={`go to ${ev.title}`}
                onSelect={() => runAndClose(() => {
                  useEventStore.getState().selectEvent(ev.id);
                  useCanvasStore.getState().panToDate(ev.startDate);
                  useCanvasStore.getState().markDirty();
                })}
                className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
              >
                <span className="w-2 h-2 rounded-full bg-accent" />
                {ev.title}
                <span className="ml-auto text-text-muted text-[10px]">{ev.startDate}</span>
              </Command.Item>
            ))}
          </Command.Group>

          {/* Timelines */}
          {timelines.length > 1 && (
            <Command.Group heading="Timelines" className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:text-text-muted [&>[cmdk-group-heading]]:font-semibold">
              {timelines.map((tl) => (
                <Command.Item
                  key={tl.id}
                  value={`switch to ${tl.title}`}
                  onSelect={() => runAndClose(() => {
                    useTimelineStore.getState().setActiveTimeline(tl.id);
                  })}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
                >
                  {tl.title}
                  {tl.id === activeTimelineId && <span className="ml-auto text-accent text-[10px]">Active</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* View */}
          <Command.Group heading="View" className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:text-text-muted [&>[cmdk-group-heading]]:font-semibold">
            <Command.Item
              value="fit all events zoom to fit"
              onSelect={() => runAndClose(() => {
                const { viewportWidth } = useCanvasStore.getState();
                const { zoom, panOffsetX } = fitAllEvents(events, viewportWidth);
                useCanvasStore.getState().setZoom(zoom);
                useCanvasStore.getState().setPan(panOffsetX, 0);
              })}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Fit All Events
            </Command.Item>
            <Command.Item
              value="zoom in"
              onSelect={() => runAndClose(() => {
                const s = useCanvasStore.getState();
                s.zoomAtPoint(200, s.viewportWidth / 2);
              })}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Zoom In
            </Command.Item>
            <Command.Item
              value="zoom out"
              onSelect={() => runAndClose(() => {
                const s = useCanvasStore.getState();
                s.zoomAtPoint(-200, s.viewportWidth / 2);
              })}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Zoom Out
            </Command.Item>
            <Command.Item
              value="toggle sidebar"
              onSelect={() => runAndClose(() => useUiStore.getState().toggleSidebar())}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Toggle Sidebar
            </Command.Item>
            <Command.Item
              value="toggle detail panel"
              onSelect={() => runAndClose(() => useUiStore.getState().toggleDetailPanel())}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Toggle Detail Panel
            </Command.Item>
            <Command.Item
              value="toggle dark mode theme"
              onSelect={() => runAndClose(() => {
                const theme = useThemeStore.getState();
                theme.setTheme(theme.theme === "dark" ? "light" : "dark");
              })}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Toggle Dark Mode
            </Command.Item>
          </Command.Group>

          {/* Actions */}
          <Command.Group heading="Actions" className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:text-text-muted [&>[cmdk-group-heading]]:font-semibold">
            <Command.Item
              value="new event create"
              onSelect={() => runAndClose(() => useUiStore.getState().openModal("quickCreate"))}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              New Event
            </Command.Item>
            <Command.Item
              value="deselect clear selection"
              onSelect={() => runAndClose(() => {
                useEventStore.getState().clearSelection();
                useCanvasStore.getState().markDirty();
              })}
              className="px-2 py-1.5 text-xs rounded cursor-pointer text-text data-[selected=true]:bg-accent/10"
            >
              Clear Selection
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
