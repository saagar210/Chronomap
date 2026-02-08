import { create } from "zustand";
import type { TimelineEvent, CreateEventInput, UpdateEventInput } from "../lib/types";
import * as cmd from "../lib/commands";

interface EventStore {
  events: TimelineEvent[];
  selectedEventId: string | null;
  loading: boolean;
  error: string | null;

  loadEvents: (timelineId: string) => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<TimelineEvent>;
  updateEvent: (input: UpdateEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  selectEvent: (id: string | null) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  selectedEventId: null,
  loading: false,
  error: null,

  loadEvents: async (timelineId) => {
    set({ loading: true, error: null });
    try {
      const events = await cmd.listEvents(timelineId);
      set({ events, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createEvent: async (input) => {
    set({ error: null });
    try {
      const event = await cmd.createEvent(input);
      set((s) => ({ events: [...s.events, event] }));
      return event;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  updateEvent: async (input) => {
    set({ error: null });
    try {
      const updated = await cmd.updateEvent(input);
      set((s) => ({
        events: s.events.map((ev) => (ev.id === updated.id ? updated : ev)),
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteEvent: async (id) => {
    set({ error: null });
    try {
      await cmd.deleteEvent(id);
      set((s) => ({
        events: s.events.filter((ev) => ev.id !== id),
        selectedEventId: s.selectedEventId === id ? null : s.selectedEventId,
      }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  selectEvent: (id) => set({ selectedEventId: id }),
  clearEvents: () => set({ events: [], selectedEventId: null, error: null }),
}));
