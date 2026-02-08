import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore } from "./history-store";
import type { HistoryEntry, HistoryEntryType } from "./history-store";

const makeEntry = (type: HistoryEntryType, before: unknown = null, after: unknown = null): HistoryEntry => ({
  type,
  before,
  after,
});

describe("useHistoryStore", () => {
  beforeEach(() => {
    useHistoryStore.setState({
      undoStack: [],
      redoStack: [],
      maxDepth: 100,
    });
  });

  describe("push", () => {
    it("adds entry to undoStack", () => {
      useHistoryStore.getState().push(makeEntry("event:create", null, { id: "e1" }));
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
      expect(useHistoryStore.getState().undoStack[0].type).toBe("event:create");
    });

    it("pushes newest entries to front of stack", () => {
      useHistoryStore.getState().push(makeEntry("event:create"));
      useHistoryStore.getState().push(makeEntry("event:update"));

      const stack = useHistoryStore.getState().undoStack;
      expect(stack[0].type).toBe("event:update");
      expect(stack[1].type).toBe("event:create");
    });

    it("clears redoStack on push", () => {
      useHistoryStore.setState({
        redoStack: [makeEntry("event:delete")],
      });

      useHistoryStore.getState().push(makeEntry("event:create"));

      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it("respects maxDepth limit", () => {
      useHistoryStore.setState({ maxDepth: 3 });

      for (let i = 0; i < 5; i++) {
        useHistoryStore.getState().push(makeEntry("event:create", null, { id: `e${i}` }));
      }

      expect(useHistoryStore.getState().undoStack).toHaveLength(3);
    });
  });

  describe("canUndo / canRedo", () => {
    it("returns false when stacks are empty", () => {
      expect(useHistoryStore.getState().canUndo()).toBe(false);
      expect(useHistoryStore.getState().canRedo()).toBe(false);
    });

    it("canUndo returns true after push", () => {
      useHistoryStore.getState().push(makeEntry("event:create"));
      expect(useHistoryStore.getState().canUndo()).toBe(true);
      expect(useHistoryStore.getState().canRedo()).toBe(false);
    });
  });

  describe("clear", () => {
    it("clears both stacks", () => {
      useHistoryStore.getState().push(makeEntry("event:create"));
      useHistoryStore.setState({
        redoStack: [makeEntry("event:delete")],
      });

      useHistoryStore.getState().clear();

      expect(useHistoryStore.getState().undoStack).toEqual([]);
      expect(useHistoryStore.getState().redoStack).toEqual([]);
    });
  });
});
