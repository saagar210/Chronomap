import { useEffect, useState } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { DetailPanel } from "./DetailPanel";
import { useTimelineStore } from "../../stores/timeline-store";
import { useTrackStore } from "../../stores/track-store";
import { useEventStore } from "../../stores/event-store";
import { useThemeStore } from "../../stores/theme-store";
import { TimelineCanvas } from "../canvas/TimelineCanvas";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { AiPanel } from "../ai/AiPanel";
import { EmptyState } from "../common/EmptyState";
import { Button } from "../common/Button";
import { Clock } from "lucide-react";

export function AppShell() {
  const { loadTimelines, activeTimelineId, timelines } = useTimelineStore();
  const { loadTracks, clearTracks } = useTrackStore();
  const { loadEvents, clearEvents } = useEventStore();
  const { loadTheme } = useThemeStore();
  const [aiOpen, setAiOpen] = useState(false);
  useKeyboardShortcuts();

  useEffect(() => {
    loadTimelines();
    loadTheme();
  }, [loadTimelines, loadTheme]);

  useEffect(() => {
    if (activeTimelineId) {
      loadTracks(activeTimelineId);
      loadEvents(activeTimelineId);
    } else {
      clearTracks();
      clearEvents();
    }
  }, [activeTimelineId, loadTracks, loadEvents, clearTracks, clearEvents]);

  return (
    <div className="h-full flex flex-col">
      <TitleBar onToggleAi={() => setAiOpen((prev) => !prev)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-canvas-bg flex items-center justify-center overflow-hidden">
          {activeTimelineId ? (
            <TimelineCanvas />
          ) : (
            <EmptyState
              icon={<Clock size={48} />}
              title={
                timelines.length === 0
                  ? "Welcome to ChronoMap"
                  : "Select a Timeline"
              }
              description={
                timelines.length === 0
                  ? "Create your first timeline to get started"
                  : "Choose a timeline from the dropdown above"
              }
              action={
                timelines.length === 0 ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      useTimelineStore.getState().createTimeline({
                        title: "My First Timeline",
                      })
                    }
                  >
                    Create Timeline
                  </Button>
                ) : undefined
              }
            />
          )}
        </main>
        <DetailPanel />
      </div>
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
