import { create } from "zustand";
import type { Timeline, CreateTimelineInput, UpdateTimelineInput } from "../lib/types";
import * as cmd from "../lib/commands";

interface TimelineStore {
  timelines: Timeline[];
  activeTimelineId: string | null;
  loading: boolean;
  error: string | null;

  loadTimelines: () => Promise<void>;
  createTimeline: (input: CreateTimelineInput) => Promise<Timeline>;
  updateTimeline: (input: UpdateTimelineInput) => Promise<void>;
  deleteTimeline: (id: string) => Promise<void>;
  setActiveTimeline: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  timelines: [],
  activeTimelineId: null,
  loading: false,
  error: null,

  loadTimelines: async () => {
    set({ loading: true, error: null });
    try {
      const timelines = await cmd.listTimelines();
      set({ timelines, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createTimeline: async (input) => {
    set({ error: null });
    try {
      const timeline = await cmd.createTimeline(input);
      set((s) => ({
        timelines: [timeline, ...s.timelines],
        activeTimelineId: timeline.id,
      }));
      return timeline;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  updateTimeline: async (input) => {
    set({ error: null });
    try {
      const updated = await cmd.updateTimeline(input);
      set((s) => ({
        timelines: s.timelines.map((t) => (t.id === updated.id ? updated : t)),
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteTimeline: async (id) => {
    set({ error: null });
    try {
      await cmd.deleteTimeline(id);
      const { activeTimelineId, timelines } = get();
      const remaining = timelines.filter((t) => t.id !== id);
      set({
        timelines: remaining,
        activeTimelineId: activeTimelineId === id ? null : activeTimelineId,
      });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  setActiveTimeline: (id) => set({ activeTimelineId: id }),
}));
