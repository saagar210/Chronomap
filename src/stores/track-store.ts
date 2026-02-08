import { create } from "zustand";
import type { Track, CreateTrackInput, UpdateTrackInput } from "../lib/types";
import * as cmd from "../lib/commands";

interface TrackStore {
  tracks: Track[];
  loading: boolean;
  error: string | null;

  loadTracks: (timelineId: string) => Promise<void>;
  createTrack: (input: CreateTrackInput) => Promise<Track>;
  updateTrack: (input: UpdateTrackInput) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  reorderTracks: (trackIds: string[]) => Promise<void>;
  clearTracks: () => void;
}

export const useTrackStore = create<TrackStore>((set) => ({
  tracks: [],
  loading: false,
  error: null,

  loadTracks: async (timelineId) => {
    set({ loading: true, error: null });
    try {
      const tracks = await cmd.listTracks(timelineId);
      set({ tracks, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createTrack: async (input) => {
    set({ error: null });
    try {
      const track = await cmd.createTrack(input);
      set((s) => ({ tracks: [...s.tracks, track] }));
      return track;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  updateTrack: async (input) => {
    set({ error: null });
    try {
      const updated = await cmd.updateTrack(input);
      set((s) => ({
        tracks: s.tracks.map((t) => (t.id === updated.id ? updated : t)),
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteTrack: async (id) => {
    set({ error: null });
    try {
      await cmd.deleteTrack(id);
      set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  reorderTracks: async (trackIds) => {
    set({ error: null });
    try {
      await cmd.reorderTracks(trackIds);
      set((s) => {
        const byId = new Map(s.tracks.map((t) => [t.id, t]));
        const reordered = trackIds
          .map((id, i) => {
            const track = byId.get(id);
            return track ? { ...track, sortOrder: i } : null;
          })
          .filter((t): t is Track => t !== null);
        return { tracks: reordered };
      });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  clearTracks: () => set({ tracks: [], error: null }),
}));
