import { create } from "zustand";
import * as cmd from "../lib/commands";
import type {
  TimelineEvent,
  Track,
  Connection,
  CreateEventInput,
  CreateTrackInput,
} from "../lib/types";
import type { CreateConnectionInput } from "../lib/commands";

export type HistoryEntryType =
  | "event:create"
  | "event:update"
  | "event:delete"
  | "track:create"
  | "track:update"
  | "track:delete"
  | "track:reorder"
  | "connection:create"
  | "connection:update"
  | "connection:delete";

export interface HistoryEntry {
  type: HistoryEntryType;
  before: unknown;
  after: unknown;
}

interface HistoryStore {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  maxDepth: number;

  push: (entry: HistoryEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

async function executeEntry(entry: HistoryEntry, reverse: boolean) {
  const data = reverse ? entry.before : entry.after;
  const reverseData = reverse ? entry.after : entry.before;

  switch (entry.type) {
    case "event:create":
      if (reverse) {
        await cmd.deleteEvent((reverseData as TimelineEvent).id);
      } else {
        await cmd.createEvent(data as CreateEventInput);
      }
      break;
    case "event:delete":
      if (reverse) {
        const ev = data as TimelineEvent;
        await cmd.createEvent({
          timelineId: ev.timelineId,
          trackId: ev.trackId,
          title: ev.title,
          description: ev.description || undefined,
          startDate: ev.startDate,
          endDate: ev.endDate || undefined,
          eventType: ev.eventType,
          importance: ev.importance,
          color: ev.color || undefined,
          icon: ev.icon || undefined,
          tags: ev.tags || undefined,
          source: ev.source || undefined,
          aiGenerated: ev.aiGenerated,
          aiConfidence: ev.aiConfidence || undefined,
        });
      } else {
        await cmd.deleteEvent((data as TimelineEvent).id);
      }
      break;
    case "event:update":
      if (reverse) {
        const before = data as TimelineEvent;
        await cmd.updateEvent({
          id: before.id,
          title: before.title,
          description: before.description,
          startDate: before.startDate,
          endDate: before.endDate || undefined,
          eventType: before.eventType,
          importance: before.importance,
          color: before.color || undefined,
          icon: before.icon || undefined,
          tags: before.tags || undefined,
          source: before.source || undefined,
          trackId: before.trackId,
        });
      } else {
        const after = data as TimelineEvent;
        await cmd.updateEvent({
          id: after.id,
          title: after.title,
          description: after.description,
          startDate: after.startDate,
          endDate: after.endDate || undefined,
          eventType: after.eventType,
          importance: after.importance,
          color: after.color || undefined,
          icon: after.icon || undefined,
          tags: after.tags || undefined,
          source: after.source || undefined,
          trackId: after.trackId,
        });
      }
      break;
    case "track:create":
      if (reverse) {
        await cmd.deleteTrack((reverseData as Track).id);
      } else {
        await cmd.createTrack(data as CreateTrackInput);
      }
      break;
    case "track:delete":
      if (reverse) {
        const t = data as Track;
        await cmd.createTrack({
          timelineId: t.timelineId,
          name: t.name,
          color: t.color,
        });
      } else {
        await cmd.deleteTrack((data as Track).id);
      }
      break;
    case "track:update":
      if (reverse) {
        const before = data as Track;
        await cmd.updateTrack({
          id: before.id,
          name: before.name,
          color: before.color,
          visible: before.visible,
        });
      } else {
        const after = data as Track;
        await cmd.updateTrack({
          id: after.id,
          name: after.name,
          color: after.color,
          visible: after.visible,
        });
      }
      break;
    case "track:reorder":
      if (reverse) {
        await cmd.reorderTracks(data as string[]);
      } else {
        await cmd.reorderTracks(data as string[]);
      }
      break;
    case "connection:create":
      if (reverse) {
        await cmd.deleteConnection((reverseData as Connection).id);
      } else {
        await cmd.createConnection(data as CreateConnectionInput);
      }
      break;
    case "connection:delete":
      if (reverse) {
        const c = data as Connection;
        await cmd.createConnection({
          timelineId: c.timelineId,
          sourceEventId: c.sourceEventId,
          targetEventId: c.targetEventId,
          connectionType: c.connectionType,
          label: c.label || undefined,
          color: c.color || undefined,
        });
      } else {
        await cmd.deleteConnection((data as Connection).id);
      }
      break;
    case "connection:update":
      if (reverse) {
        const before = data as Connection;
        await cmd.updateConnection({
          id: before.id,
          connectionType: before.connectionType,
          label: before.label || undefined,
          color: before.color || undefined,
        });
      } else {
        const after = data as Connection;
        await cmd.updateConnection({
          id: after.id,
          connectionType: after.connectionType,
          label: after.label || undefined,
          color: after.color || undefined,
        });
      }
      break;
  }
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxDepth: 100,

  push: (entry) =>
    set((s) => {
      const stack = [entry, ...s.undoStack].slice(0, s.maxDepth);
      return { undoStack: stack, redoStack: [] };
    }),

  undo: async () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const [entry, ...rest] = undoStack;
    set({ undoStack: rest, redoStack: [entry, ...redoStack] });
    await executeEntry(entry, true);
  },

  redo: async () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const [entry, ...rest] = redoStack;
    set({ redoStack: rest, undoStack: [entry, ...undoStack] });
    await executeEntry(entry, false);
  },

  clear: () => set({ undoStack: [], redoStack: [] }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
