import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEventStore } from "./event-store";
import * as cmd from "../lib/commands";

vi.mock("../lib/commands", () => ({
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

const mockEvent = (overrides = {}) => ({
  id: "e1",
  timelineId: "tl1",
  trackId: "t1",
  title: "Moon Landing",
  description: "First humans on the Moon",
  startDate: "1969-07-20",
  endDate: null,
  eventType: "point" as const,
  importance: 5,
  color: null,
  icon: null,
  imagePath: null,
  externalLink: null,
  tags: "",
  source: null,
  aiGenerated: false,
  aiConfidence: null,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ...overrides,
});

describe("useEventStore", () => {
  beforeEach(() => {
    useEventStore.setState({
      events: [],
      selectedEventId: null,
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("loadEvents fetches and stores events", async () => {
    const events = [mockEvent(), mockEvent({ id: "e2", title: "Apollo 13" })];
    vi.mocked(cmd.listEvents).mockResolvedValueOnce(events);

    await useEventStore.getState().loadEvents("tl1");

    expect(cmd.listEvents).toHaveBeenCalledWith("tl1");
    expect(useEventStore.getState().events).toEqual(events);
    expect(useEventStore.getState().loading).toBe(false);
  });

  it("loadEvents handles errors", async () => {
    vi.mocked(cmd.listEvents).mockRejectedValueOnce("DB error");

    await useEventStore.getState().loadEvents("tl1");

    expect(useEventStore.getState().error).toBe("DB error");
    expect(useEventStore.getState().loading).toBe(false);
  });

  it("createEvent appends event and returns it", async () => {
    const newEvent = mockEvent({ id: "e-new", title: "Sputnik" });
    vi.mocked(cmd.createEvent).mockResolvedValueOnce(newEvent);

    const input = {
      timelineId: "tl1",
      trackId: "t1",
      title: "Sputnik",
      startDate: "1957-10-04",
    };
    const result = await useEventStore.getState().createEvent(input);

    expect(cmd.createEvent).toHaveBeenCalledWith(input);
    expect(result).toEqual(newEvent);
    expect(useEventStore.getState().events).toHaveLength(1);
  });

  it("createEvent sets error on failure and rethrows", async () => {
    vi.mocked(cmd.createEvent).mockRejectedValueOnce("Create failed");

    await expect(
      useEventStore.getState().createEvent({
        timelineId: "tl1",
        trackId: "t1",
        title: "Fail",
        startDate: "2024-01-01",
      })
    ).rejects.toBe("Create failed");

    expect(useEventStore.getState().error).toBe("Create failed");
  });

  it("updateEvent replaces event in state", async () => {
    useEventStore.setState({ events: [mockEvent()] });
    const updated = mockEvent({ title: "Moon Landing (Updated)" });
    vi.mocked(cmd.updateEvent).mockResolvedValueOnce(updated);

    await useEventStore
      .getState()
      .updateEvent({ id: "e1", title: "Moon Landing (Updated)" });

    expect(useEventStore.getState().events[0].title).toBe(
      "Moon Landing (Updated)"
    );
  });

  it("updateEvent sets error on failure and rethrows", async () => {
    vi.mocked(cmd.updateEvent).mockRejectedValueOnce("Update failed");

    await expect(
      useEventStore.getState().updateEvent({ id: "e1", title: "X" })
    ).rejects.toBe("Update failed");

    expect(useEventStore.getState().error).toBe("Update failed");
  });

  it("deleteEvent removes event from state", async () => {
    useEventStore.setState({
      events: [mockEvent(), mockEvent({ id: "e2", title: "Apollo 13" })],
    });
    vi.mocked(cmd.deleteEvent).mockResolvedValueOnce(undefined);

    await useEventStore.getState().deleteEvent("e1");

    expect(cmd.deleteEvent).toHaveBeenCalledWith("e1");
    expect(useEventStore.getState().events).toHaveLength(1);
    expect(useEventStore.getState().events[0].id).toBe("e2");
  });

  it("deleteEvent clears selectedEventId when deleting selected event", async () => {
    useEventStore.setState({
      events: [mockEvent()],
      selectedEventId: "e1",
    });
    vi.mocked(cmd.deleteEvent).mockResolvedValueOnce(undefined);

    await useEventStore.getState().deleteEvent("e1");

    expect(useEventStore.getState().selectedEventId).toBeNull();
  });

  it("deleteEvent preserves selectedEventId when deleting different event", async () => {
    useEventStore.setState({
      events: [mockEvent(), mockEvent({ id: "e2" })],
      selectedEventId: "e2",
    });
    vi.mocked(cmd.deleteEvent).mockResolvedValueOnce(undefined);

    await useEventStore.getState().deleteEvent("e1");

    expect(useEventStore.getState().selectedEventId).toBe("e2");
  });

  it("selectEvent sets selectedEventId", () => {
    useEventStore.getState().selectEvent("e1");
    expect(useEventStore.getState().selectedEventId).toBe("e1");
  });

  it("selectEvent with null clears selection", () => {
    useEventStore.setState({ selectedEventId: "e1" });
    useEventStore.getState().selectEvent(null);
    expect(useEventStore.getState().selectedEventId).toBeNull();
  });

  it("clearEvents resets all event state", () => {
    useEventStore.setState({
      events: [mockEvent()],
      selectedEventId: "e1",
      error: "old error",
    });

    useEventStore.getState().clearEvents();

    expect(useEventStore.getState().events).toEqual([]);
    expect(useEventStore.getState().selectedEventId).toBeNull();
    expect(useEventStore.getState().error).toBeNull();
  });
});
