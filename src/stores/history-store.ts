import { create } from "zustand";

interface HistoryEntry {
  type: string;
  before: unknown;
  after: unknown;
}

interface HistoryStore {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  maxDepth: number;

  push: (entry: HistoryEntry) => void;
  undo: () => HistoryEntry | undefined;
  redo: () => HistoryEntry | undefined;
  clear: () => void;
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

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return undefined;
    const [entry, ...rest] = undoStack;
    set({ undoStack: rest, redoStack: [entry, ...redoStack] });
    return entry;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return undefined;
    const [entry, ...rest] = redoStack;
    set({ redoStack: rest, undoStack: [entry, ...undoStack] });
    return entry;
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
