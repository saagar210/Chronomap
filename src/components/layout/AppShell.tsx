import { useEffect, useState, useCallback, useMemo } from "react";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { DetailPanel } from "./DetailPanel";
import { useTimelineStore } from "../../stores/timeline-store";
import { useTrackStore } from "../../stores/track-store";
import { useEventStore } from "../../stores/event-store";
import { useThemeStore } from "../../stores/theme-store";
import { useConnectionStore } from "../../stores/connection-store";
import { TimelineCanvas } from "../canvas/TimelineCanvas";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { AiPanel } from "../ai/AiPanel";
import { EmptyState } from "../common/EmptyState";
import { WelcomeScreen } from "../common/WelcomeScreen";

import { ToastContainer } from "../common/Toast";
import { CommandPalette } from "../common/CommandPalette";
import { Clock } from "lucide-react";

export function AppShell() {
  const { loadTimelines, activeTimelineId, timelines } = useTimelineStore();
  const { loadTracks, clearTracks } = useTrackStore();
  const { loadEvents, clearEvents } = useEventStore();
  const { loadConnections, clearConnections } = useConnectionStore();
  const { loadTheme } = useThemeStore();
  const [aiOpen, setAiOpen] = useState(false);
  const toggleAi = useCallback(() => setAiOpen((prev) => !prev), []);
  const handleNewEvent = useCallback(() => {
    // Open the modal for creating a new event
    const { useUiStore } = require("../../stores/ui-store");
    useUiStore.getState().openModal("create-event");
  }, []);
  const shortcutOptions = useMemo(
    () => ({ onToggleAi: toggleAi, onNewEvent: handleNewEvent }),
    [toggleAi, handleNewEvent]
  );
  useKeyboardShortcuts(shortcutOptions);

  useEffect(() => {
    loadTimelines();
    loadTheme();
  }, [loadTimelines, loadTheme]);

  useEffect(() => {
    if (activeTimelineId) {
      loadTracks(activeTimelineId);
      loadEvents(activeTimelineId);
      loadConnections(activeTimelineId);
    } else {
      clearTracks();
      clearEvents();
      clearConnections();
    }
  }, [activeTimelineId, loadTracks, loadEvents, loadConnections, clearTracks, clearEvents, clearConnections]);

  return (
    <div className="h-full flex flex-col">
      <TitleBar onToggleAi={toggleAi} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-canvas-bg flex items-center justify-center overflow-hidden">
          {activeTimelineId ? (
            <TimelineCanvas />
          ) : timelines.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <EmptyState
              icon={<Clock size={48} />}
              title="Select a Timeline"
              description="Choose a timeline from the dropdown above"
            />
          )}
        </main>
        <DetailPanel />
      </div>
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}
