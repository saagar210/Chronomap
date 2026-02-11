import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

const {
  loadTimelines,
  loadTheme,
  loadTracks,
  loadEvents,
  loadConnections,
  clearTracks,
  clearEvents,
  clearConnections,
} = vi.hoisted(() => ({
  loadTimelines: vi.fn(),
  loadTheme: vi.fn(),
  loadTracks: vi.fn(),
  loadEvents: vi.fn(),
  loadConnections: vi.fn(),
  clearTracks: vi.fn(),
  clearEvents: vi.fn(),
  clearConnections: vi.fn(),
}));

vi.mock("../../stores/timeline-store", () => ({
  useTimelineStore: () => ({
    loadTimelines,
    activeTimelineId: null,
    timelines: [],
  }),
}));

vi.mock("../../stores/track-store", () => ({
  useTrackStore: () => ({
    loadTracks,
    clearTracks,
  }),
}));

vi.mock("../../stores/event-store", () => ({
  useEventStore: () => ({
    loadEvents,
    clearEvents,
  }),
}));

vi.mock("../../stores/connection-store", () => ({
  useConnectionStore: () => ({
    loadConnections,
    clearConnections,
  }),
}));

vi.mock("../../stores/theme-store", () => ({
  useThemeStore: () => ({
    loadTheme,
  }),
}));

vi.mock("../common/WelcomeScreen", () => ({
  WelcomeScreen: () => <div>Welcome to ChronoMap</div>,
}));

vi.mock("./TitleBar", () => ({
  TitleBar: () => <div>TitleBar</div>,
}));

vi.mock("./Sidebar", () => ({
  Sidebar: () => <div>Tracks</div>,
}));

vi.mock("./DetailPanel", () => ({
  DetailPanel: () => <div>DetailPanel</div>,
}));

vi.mock("../ai/AiPanel", () => ({
  AiPanel: () => <div>AiPanel</div>,
}));

vi.mock("../common/Toast", () => ({
  ToastContainer: () => <div>ToastContainer</div>,
}));

vi.mock("../common/CommandPalette", () => ({
  CommandPalette: () => <div>CommandPalette</div>,
}));

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 3-panel layout and triggers initial loaders", () => {
    render(<AppShell />);

    expect(screen.getByText("Tracks")).toBeInTheDocument();
    expect(screen.getByText("Welcome to ChronoMap")).toBeInTheDocument();
    expect(screen.getByText("DetailPanel")).toBeInTheDocument();

    expect(loadTimelines).toHaveBeenCalledTimes(1);
    expect(loadTheme).toHaveBeenCalledTimes(1);
    expect(clearTracks).toHaveBeenCalledTimes(1);
    expect(clearEvents).toHaveBeenCalledTimes(1);
    expect(clearConnections).toHaveBeenCalledTimes(1);
    expect(loadTracks).not.toHaveBeenCalled();
    expect(loadEvents).not.toHaveBeenCalled();
    expect(loadConnections).not.toHaveBeenCalled();
  });
});
