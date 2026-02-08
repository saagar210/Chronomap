import { create } from "zustand";
import type { TimelineEvent, CreateEventInput, UpdateEventInput, BulkUpdateInput } from "../lib/types";
import * as cmd from "../lib/commands";
import { useHistoryStore } from "./history-store";
import { useToastStore } from "./toast-store";

interface EventStore {
  events: TimelineEvent[];
  selectedEventId: string | null;
  selectedEventIds: Set<string>;
  loading: boolean;
  error: string | null;

  loadEvents: (timelineId: string) => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<TimelineEvent>;
  updateEvent: (input: UpdateEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  selectEvent: (id: string | null) => void;
  toggleEventSelection: (id: string) => void;
  selectEventsInRange: (ids: string[]) => void;
  clearSelection: () => void;
  bulkDeleteEvents: (ids: string[]) => Promise<void>;
  bulkUpdateEvents: (input: BulkUpdateInput) => Promise<void>;
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  selectedEventId: null,
  selectedEventIds: new Set<string>(),
  loading: false,
  error: null,

  loadEvents: async (timelineId) => {
    set({ loading: true, error: null });
    try {
      const events = await cmd.listEvents(timelineId);
      set({ events, loading: false });
    } catch (e) {
      const msg = String(e);
      set({ error: msg, loading: false });
      useToastStore.getState().addToast({ type: "error", title: "Failed to load events", description: msg });
    }
  },

  createEvent: async (input) => {
    set({ error: null });
    try {
      const event = await cmd.createEvent(input);
      set((s) => ({ events: [...s.events, event] }));
      useHistoryStore.getState().push({ type: "event:create", before: null, after: event });
      useToastStore.getState().addToast({ type: "success", title: `Created "${event.title}"` });
      return event;
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to create event", description: msg });
      throw e;
    }
  },

  updateEvent: async (input) => {
    set({ error: null });
    const before = get().events.find((ev) => ev.id === input.id);
    try {
      const updated = await cmd.updateEvent(input);
      set((s) => ({
        events: s.events.map((ev) => (ev.id === updated.id ? updated : ev)),
      }));
      if (before) {
        useHistoryStore.getState().push({ type: "event:update", before, after: updated });
      }
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to update event", description: msg });
      throw e;
    }
  },

  deleteEvent: async (id) => {
    set({ error: null });
    const before = get().events.find((ev) => ev.id === id);
    try {
      await cmd.deleteEvent(id);
      set((s) => ({
        events: s.events.filter((ev) => ev.id !== id),
        selectedEventId: s.selectedEventId === id ? null : s.selectedEventId,
        selectedEventIds: (() => {
          const next = new Set(s.selectedEventIds);
          next.delete(id);
          return next;
        })(),
      }));
      if (before) {
        useHistoryStore.getState().push({ type: "event:delete", before, after: null });
        useToastStore.getState().addToast({ type: "success", title: `Deleted "${before.title}"` });
      }
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Failed to delete event", description: msg });
      throw e;
    }
  },

  selectEvent: (id) => set({ selectedEventId: id, selectedEventIds: new Set<string>() }),

  toggleEventSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedEventIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedEventIds: next, selectedEventId: null };
    }),

  selectEventsInRange: (ids) =>
    set({ selectedEventIds: new Set(ids), selectedEventId: null }),

  clearSelection: () =>
    set({ selectedEventIds: new Set<string>(), selectedEventId: null }),

  bulkDeleteEvents: async (ids) => {
    set({ error: null });
    const beforeEvents = get().events.filter((ev) => ids.includes(ev.id));
    try {
      await cmd.bulkDeleteEvents(ids);
      set((s) => ({
        events: s.events.filter((ev) => !ids.includes(ev.id)),
        selectedEventIds: new Set<string>(),
        selectedEventId: null,
      }));
      // Push a single history entry for the bulk delete
      for (const ev of beforeEvents) {
        useHistoryStore.getState().push({ type: "event:delete", before: ev, after: null });
      }
      useToastStore.getState().addToast({ type: "success", title: `Deleted ${beforeEvents.length} events` });
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Bulk delete failed", description: msg });
      throw e;
    }
  },

  bulkUpdateEvents: async (input) => {
    set({ error: null });
    try {
      await cmd.bulkUpdateEvents(input);
      // Reload events to get updated data
      const timelineId = get().events[0]?.timelineId;
      if (timelineId) {
        const events = await cmd.listEvents(timelineId);
        set({ events });
      }
      useToastStore.getState().addToast({ type: "success", title: `Updated ${input.ids.length} events` });
    } catch (e) {
      const msg = String(e);
      set({ error: msg });
      useToastStore.getState().addToast({ type: "error", title: "Bulk update failed", description: msg });
      throw e;
    }
  },

  clearEvents: () => set({ events: [], selectedEventId: null, selectedEventIds: new Set<string>(), error: null }),
}));
