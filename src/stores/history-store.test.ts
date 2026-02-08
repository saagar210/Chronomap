import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore } from "./history-store";

const makeEntry = (type: string, before: unknown = null, after: unknown = null) => ({
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
      useHistoryStore.getState().push(makeEntry("create_event", null, { id: "e1" }));
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
      expect(useHistoryStore.getState().undoStack[0].type).toBe("create_event");
    });

    it("pushes newest entries to front of stack", () => {
      useHistoryStore.getState().push(makeEntry("first"));
      useHistoryStore.getState().push(makeEntry("second"));

      const stack = useHistoryStore.getState().undoStack;
      expect(stack[0].type).toBe("second");
      expect(stack[1].type).toBe("first");
    });

    it("clears redoStack on push", () => {
      // Manually set up a redo stack
      useHistoryStore.setState({
        redoStack: [makeEntry("old_redo")],
      });

      useHistoryStore.getState().push(makeEntry("new_action"));

      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it("respects maxDepth limit", () => {
      useHistoryStore.setState({ maxDepth: 3 });

      for (let i = 0; i < 5; i++) {
        useHistoryStore.getState().push(makeEntry(`action_${i}`));
      }

      expect(useHistoryStore.getState().undoStack).toHaveLength(3);
      // Most recent should be at front
      expect(useHistoryStore.getState().undoStack[0].type).toBe("action_4");
    });
  });

  describe("undo", () => {
    it("returns undefined when undoStack is empty", () => {
      const result = useHistoryStore.getState().undo();
      expect(result).toBeUndefined();
    });

    it("pops from undoStack and pushes to redoStack", () => {
      useHistoryStore.getState().push(makeEntry("action_a"));
      useHistoryStore.getState().push(makeEntry("action_b"));

      const entry = useHistoryStore.getState().undo();

      expect(entry?.type).toBe("action_b");
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
      expect(useHistoryStore.getState().undoStack[0].type).toBe("action_a");
      expect(useHistoryStore.getState().redoStack).toHaveLength(1);
      expect(useHistoryStore.getState().redoStack[0].type).toBe("action_b");
    });

    it("returns the most recent entry", () => {
      useHistoryStore.getState().push(makeEntry("first", "old", "new"));
      const entry = useHistoryStore.getState().undo();
      expect(entry).toEqual(makeEntry("first", "old", "new"));
    });
  });

  describe("redo", () => {
    it("returns undefined when redoStack is empty", () => {
      const result = useHistoryStore.getState().redo();
      expect(result).toBeUndefined();
    });

    it("pops from redoStack and pushes to undoStack", () => {
      useHistoryStore.getState().push(makeEntry("action_a"));
      useHistoryStore.getState().undo(); // move action_a to redo

      const entry = useHistoryStore.getState().redo();

      expect(entry?.type).toBe("action_a");
      expect(useHistoryStore.getState().undoStack).toHaveLength(1);
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it("supports multiple undo/redo cycles", () => {
      useHistoryStore.getState().push(makeEntry("a"));
      useHistoryStore.getState().push(makeEntry("b"));

      useHistoryStore.getState().undo(); // b -> redo
      useHistoryStore.getState().undo(); // a -> redo

      expect(useHistoryStore.getState().undoStack).toHaveLength(0);
      expect(useHistoryStore.getState().redoStack).toHaveLength(2);

      useHistoryStore.getState().redo(); // a -> undo
      useHistoryStore.getState().redo(); // b -> undo

      expect(useHistoryStore.getState().undoStack).toHaveLength(2);
      expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("clears both stacks", () => {
      useHistoryStore.getState().push(makeEntry("action"));
      useHistoryStore.getState().undo();

      useHistoryStore.getState().clear();

      expect(useHistoryStore.getState().undoStack).toEqual([]);
      expect(useHistoryStore.getState().redoStack).toEqual([]);
    });
  });
});
