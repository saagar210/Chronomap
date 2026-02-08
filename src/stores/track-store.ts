import { create } from "zustand";
import type { Track, CreateTrackInput, UpdateTrackInput } from "../lib/types";
import * as cmd from "../lib/commands";
import { useHistoryStore } from "./history-store";
import { useToastStore } from "./toast-store";

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

export const useTrackStore = create<TrackStore>((set, get) => ({
  tracks: [],
  loading: false,
  error: null,

  loadTracks: async (timelineId) => {
    set({ loading: true, error: null });
    try {
      const tracks = await cmd.listTracks(timelineId);
      set({ tracks, loading: false });
    } catch (e) {
      const msg = String(e);
      set({ error: msg, loading: false });
      useToastStore.getState().addToast({ type: "error", title: "Failed to load tracks", description: msg });
    }
  },

  createTrack: async (input) => {
    set({ error: null });
    try {
      const track = await cmd.createTrack(input);
      set((s) => ({ tracks: [...s.tracks, track] }));
      useHistoryStore.getState().push({ type: "track:create", before: null, after: track });
      useToastStore.getState().addToast({ type: "success", title: `Created track "${track.name}"` });
      return track;
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to create track", description: msg });
      throw e;
    }
  },

  updateTrack: async (input) => {
    set({ error: null });
    const before = get().tracks.find((t) => t.id === input.id);
    try {
      const updated = await cmd.updateTrack(input);
      set((s) => ({
        tracks: s.tracks.map((t) => (t.id === updated.id ? updated : t)),
      }));
      if (before) {
        useHistoryStore.getState().push({ type: "track:update", before, after: updated });
      }
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to update track", description: msg });
      throw e;
    }
  },

  deleteTrack: async (id) => {
    set({ error: null });
    const before = get().tracks.find((t) => t.id === id);
    try {
      await cmd.deleteTrack(id);
      set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) }));
      if (before) {
        useHistoryStore.getState().push({ type: "track:delete", before, after: null });
        useToastStore.getState().addToast({ type: "success", title: `Deleted track "${before.name}"` });
      }
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to delete track", description: msg });
      throw e;
    }
  },

  reorderTracks: async (trackIds) => {
    set({ error: null });
    const beforeOrder = get().tracks.map((t) => t.id);
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
      useHistoryStore.getState().push({ type: "track:reorder", before: beforeOrder, after: trackIds });
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to reorder tracks", description: msg });
      throw e;
    }
  },

  clearTracks: () => set({ tracks: [], error: null }),
}));
