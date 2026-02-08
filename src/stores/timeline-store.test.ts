import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useTimelineStore } from "./timeline-store";

const mockInvoke = vi.mocked(invoke);

describe("useTimelineStore", () => {
  beforeEach(() => {
    useTimelineStore.setState({
      timelines: [],
      activeTimelineId: null,
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("loads timelines", async () => {
    const mockTimelines = [
      {
        id: "1",
        title: "Test",
        description: "",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ];
    mockInvoke.mockResolvedValueOnce(mockTimelines);

    await useTimelineStore.getState().loadTimelines();

    expect(mockInvoke).toHaveBeenCalledWith("list_timelines");
    expect(useTimelineStore.getState().timelines).toEqual(mockTimelines);
    expect(useTimelineStore.getState().loading).toBe(false);
  });

  it("creates a timeline and sets it active", async () => {
    const newTimeline = {
      id: "new-1",
      title: "New",
      description: "",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };
    mockInvoke.mockResolvedValueOnce(newTimeline);

    await useTimelineStore.getState().createTimeline({ title: "New" });

    expect(useTimelineStore.getState().timelines).toHaveLength(1);
    expect(useTimelineStore.getState().activeTimelineId).toBe("new-1");
  });

  it("sets active timeline", () => {
    useTimelineStore.getState().setActiveTimeline("abc");
    expect(useTimelineStore.getState().activeTimelineId).toBe("abc");
  });

  it("handles load error", async () => {
    mockInvoke.mockRejectedValueOnce("DB error");

    await useTimelineStore.getState().loadTimelines();

    expect(useTimelineStore.getState().error).toBe("DB error");
    expect(useTimelineStore.getState().loading).toBe(false);
  });

  it("deletes timeline and clears active if needed", async () => {
    useTimelineStore.setState({
      timelines: [
        {
          id: "1",
          title: "T1",
          description: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
      activeTimelineId: "1",
    });
    mockInvoke.mockResolvedValueOnce(undefined);

    await useTimelineStore.getState().deleteTimeline("1");

    expect(useTimelineStore.getState().timelines).toHaveLength(0);
    expect(useTimelineStore.getState().activeTimelineId).toBeNull();
  });
});
