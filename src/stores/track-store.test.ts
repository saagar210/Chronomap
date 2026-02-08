import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTrackStore } from "./track-store";
import * as cmd from "../lib/commands";

vi.mock("../lib/commands", () => ({
  listTracks: vi.fn(),
  createTrack: vi.fn(),
  updateTrack: vi.fn(),
  deleteTrack: vi.fn(),
  reorderTracks: vi.fn(),
}));

const mockTrack = (overrides = {}) => ({
  id: "t1",
  timelineId: "tl1",
  name: "Politics",
  color: "#3b82f6",
  sortOrder: 0,
  visible: true,
  createdAt: "2024-01-01",
  ...overrides,
});

describe("useTrackStore", () => {
  beforeEach(() => {
    useTrackStore.setState({
      tracks: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("loadTracks fetches and stores tracks", async () => {
    const tracks = [mockTrack(), mockTrack({ id: "t2", name: "Culture" })];
    vi.mocked(cmd.listTracks).mockResolvedValueOnce(tracks);

    await useTrackStore.getState().loadTracks("tl1");

    expect(cmd.listTracks).toHaveBeenCalledWith("tl1");
    expect(useTrackStore.getState().tracks).toEqual(tracks);
    expect(useTrackStore.getState().loading).toBe(false);
  });

  it("loadTracks sets loading true then false", async () => {
    vi.mocked(cmd.listTracks).mockImplementation(
      () =>
        new Promise((resolve) => {
          expect(useTrackStore.getState().loading).toBe(true);
          resolve([]);
        })
    );

    await useTrackStore.getState().loadTracks("tl1");
    expect(useTrackStore.getState().loading).toBe(false);
  });

  it("loadTracks handles errors", async () => {
    vi.mocked(cmd.listTracks).mockRejectedValueOnce("Network error");

    await useTrackStore.getState().loadTracks("tl1");

    expect(useTrackStore.getState().error).toBe("Network error");
    expect(useTrackStore.getState().loading).toBe(false);
    expect(useTrackStore.getState().tracks).toEqual([]);
  });

  it("createTrack appends to tracks list", async () => {
    const newTrack = mockTrack({ id: "t-new", name: "Science" });
    vi.mocked(cmd.createTrack).mockResolvedValueOnce(newTrack);

    const result = await useTrackStore
      .getState()
      .createTrack({ timelineId: "tl1", name: "Science" });

    expect(cmd.createTrack).toHaveBeenCalledWith({
      timelineId: "tl1",
      name: "Science",
    });
    expect(result).toEqual(newTrack);
    expect(useTrackStore.getState().tracks).toHaveLength(1);
    expect(useTrackStore.getState().tracks[0].name).toBe("Science");
  });

  it("createTrack sets error on failure and rethrows", async () => {
    vi.mocked(cmd.createTrack).mockRejectedValueOnce("DB error");

    await expect(
      useTrackStore
        .getState()
        .createTrack({ timelineId: "tl1", name: "Fail" })
    ).rejects.toBe("DB error");

    expect(useTrackStore.getState().error).toBe("DB error");
  });

  it("updateTrack replaces the track in state", async () => {
    const original = mockTrack();
    useTrackStore.setState({ tracks: [original] });

    const updated = { ...original, name: "Politics Updated" };
    vi.mocked(cmd.updateTrack).mockResolvedValueOnce(updated);

    await useTrackStore
      .getState()
      .updateTrack({ id: "t1", name: "Politics Updated" });

    expect(cmd.updateTrack).toHaveBeenCalledWith({
      id: "t1",
      name: "Politics Updated",
    });
    expect(useTrackStore.getState().tracks[0].name).toBe("Politics Updated");
  });

  it("updateTrack sets error on failure and rethrows", async () => {
    vi.mocked(cmd.updateTrack).mockRejectedValueOnce("Update failed");

    await expect(
      useTrackStore.getState().updateTrack({ id: "t1", name: "X" })
    ).rejects.toBe("Update failed");

    expect(useTrackStore.getState().error).toBe("Update failed");
  });

  it("deleteTrack removes track from state", async () => {
    useTrackStore.setState({
      tracks: [mockTrack(), mockTrack({ id: "t2", name: "Culture" })],
    });
    vi.mocked(cmd.deleteTrack).mockResolvedValueOnce(undefined);

    await useTrackStore.getState().deleteTrack("t1");

    expect(cmd.deleteTrack).toHaveBeenCalledWith("t1");
    expect(useTrackStore.getState().tracks).toHaveLength(1);
    expect(useTrackStore.getState().tracks[0].id).toBe("t2");
  });

  it("deleteTrack sets error on failure and rethrows", async () => {
    vi.mocked(cmd.deleteTrack).mockRejectedValueOnce("Delete failed");

    await expect(
      useTrackStore.getState().deleteTrack("t1")
    ).rejects.toBe("Delete failed");

    expect(useTrackStore.getState().error).toBe("Delete failed");
  });

  it("clearTracks resets tracks and error", () => {
    useTrackStore.setState({
      tracks: [mockTrack()],
      error: "old error",
    });

    useTrackStore.getState().clearTracks();

    expect(useTrackStore.getState().tracks).toEqual([]);
    expect(useTrackStore.getState().error).toBeNull();
  });
});
