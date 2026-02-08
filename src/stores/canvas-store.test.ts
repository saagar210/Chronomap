import { describe, it, expect, beforeEach } from "vitest";
import { useCanvasStore } from "./canvas-store";
import { ZOOM_LIMITS } from "../lib/constants";

describe("useCanvasStore", () => {
  beforeEach(() => {
    useCanvasStore.setState({
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
      viewportWidth: 0,
      viewportHeight: 0,
      needsRender: true,
    });
  });

  describe("setZoom", () => {
    it("sets zoom within bounds", () => {
      useCanvasStore.getState().setZoom(5);
      expect(useCanvasStore.getState().zoomLevel).toBe(5);
    });

    it("clamps zoom to minimum", () => {
      useCanvasStore.getState().setZoom(0.0001);
      expect(useCanvasStore.getState().zoomLevel).toBe(ZOOM_LIMITS.min);
    });

    it("clamps zoom to maximum", () => {
      useCanvasStore.getState().setZoom(9999);
      expect(useCanvasStore.getState().zoomLevel).toBe(ZOOM_LIMITS.max);
    });

    it("marks canvas as needing render", () => {
      useCanvasStore.setState({ needsRender: false });
      useCanvasStore.getState().setZoom(2);
      expect(useCanvasStore.getState().needsRender).toBe(true);
    });
  });

  describe("setPan", () => {
    it("sets pan offset", () => {
      useCanvasStore.getState().setPan(100, 200);
      expect(useCanvasStore.getState().panOffset).toEqual({ x: 100, y: 200 });
    });

    it("marks canvas as needing render", () => {
      useCanvasStore.setState({ needsRender: false });
      useCanvasStore.getState().setPan(10, 20);
      expect(useCanvasStore.getState().needsRender).toBe(true);
    });
  });

  describe("pan (relative)", () => {
    it("adds to current pan offset", () => {
      useCanvasStore.setState({ panOffset: { x: 100, y: 50 } });
      useCanvasStore.getState().pan(25, -10);
      expect(useCanvasStore.getState().panOffset).toEqual({ x: 125, y: 40 });
    });
  });

  describe("setViewport", () => {
    it("sets viewport dimensions", () => {
      useCanvasStore.getState().setViewport(1920, 1080);
      expect(useCanvasStore.getState().viewportWidth).toBe(1920);
      expect(useCanvasStore.getState().viewportHeight).toBe(1080);
    });

    it("marks canvas as needing render", () => {
      useCanvasStore.setState({ needsRender: false });
      useCanvasStore.getState().setViewport(800, 600);
      expect(useCanvasStore.getState().needsRender).toBe(true);
    });
  });

  describe("markDirty / markClean", () => {
    it("markDirty sets needsRender to true", () => {
      useCanvasStore.setState({ needsRender: false });
      useCanvasStore.getState().markDirty();
      expect(useCanvasStore.getState().needsRender).toBe(true);
    });

    it("markClean sets needsRender to false", () => {
      useCanvasStore.setState({ needsRender: true });
      useCanvasStore.getState().markClean();
      expect(useCanvasStore.getState().needsRender).toBe(false);
    });
  });

  describe("zoomAtPoint", () => {
    it("zooms in with positive delta", () => {
      useCanvasStore.setState({ zoomLevel: 1, panOffset: { x: 0, y: 0 } });
      useCanvasStore.getState().zoomAtPoint(1, 500);
      expect(useCanvasStore.getState().zoomLevel).toBeGreaterThan(1);
    });

    it("zooms out with negative delta", () => {
      useCanvasStore.setState({ zoomLevel: 1, panOffset: { x: 0, y: 0 } });
      useCanvasStore.getState().zoomAtPoint(-1, 500);
      expect(useCanvasStore.getState().zoomLevel).toBeLessThan(1);
    });

    it("clamps zoom at point to min", () => {
      useCanvasStore.setState({ zoomLevel: ZOOM_LIMITS.min });
      useCanvasStore.getState().zoomAtPoint(-1, 500);
      expect(useCanvasStore.getState().zoomLevel).toBeGreaterThanOrEqual(
        ZOOM_LIMITS.min
      );
    });

    it("clamps zoom at point to max", () => {
      useCanvasStore.setState({ zoomLevel: ZOOM_LIMITS.max });
      useCanvasStore.getState().zoomAtPoint(1, 500);
      expect(useCanvasStore.getState().zoomLevel).toBeLessThanOrEqual(
        ZOOM_LIMITS.max
      );
    });

    it("adjusts pan to keep point under cursor fixed", () => {
      useCanvasStore.setState({
        zoomLevel: 1,
        panOffset: { x: 0, y: 0 },
      });
      const screenX = 400;
      useCanvasStore.getState().zoomAtPoint(1, screenX);

      const state = useCanvasStore.getState();
      // Pan should have shifted (not remain zero) because zoom changed
      // and the point-under-cursor formula adjusts panX
      expect(state.panOffset.x).not.toBe(0);
      expect(state.needsRender).toBe(true);
    });

    it("preserves y pan offset", () => {
      useCanvasStore.setState({
        zoomLevel: 1,
        panOffset: { x: 0, y: 42 },
      });
      useCanvasStore.getState().zoomAtPoint(1, 500);
      expect(useCanvasStore.getState().panOffset.y).toBe(42);
    });
  });
});
