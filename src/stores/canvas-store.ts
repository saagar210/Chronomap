import { create } from "zustand";
import { ZOOM_LIMITS } from "../lib/constants";
import { dateToPixel } from "../lib/canvas-math";

interface CanvasStore {
  zoomLevel: number;
  targetZoom: number;
  panOffset: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  needsRender: boolean;

  setZoom: (zoom: number) => void;
  zoomAtPoint: (delta: number, screenX: number) => void;
  animateZoom: () => boolean;
  setPan: (x: number, y: number) => void;
  pan: (dx: number, dy: number) => void;
  panToDate: (dateStr: string) => void;
  setViewport: (width: number, height: number) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  zoomLevel: 1,
  targetZoom: 1,
  panOffset: { x: 0, y: 0 },
  viewportWidth: 0,
  viewportHeight: 0,
  needsRender: true,

  setZoom: (zoom) => {
    const clamped = Math.max(ZOOM_LIMITS.min, Math.min(ZOOM_LIMITS.max, zoom));
    set({
      zoomLevel: clamped,
      targetZoom: clamped,
      needsRender: true,
    });
  },

  zoomAtPoint: (delta, _screenX) =>
    set((s) => {
      const factor = delta > 0 ? 1.15 : 1 / 1.15;
      const newTarget = Math.max(
        ZOOM_LIMITS.min,
        Math.min(ZOOM_LIMITS.max, s.targetZoom * factor)
      );
      return {
        targetZoom: newTarget,
        needsRender: true,
      };
    }),

  animateZoom: () => {
    const s = get();
    const diff = s.targetZoom - s.zoomLevel;
    if (Math.abs(diff) < 0.001) {
      // Snap to target and stop animating
      if (s.zoomLevel !== s.targetZoom) {
        set({ zoomLevel: s.targetZoom });
      }
      return false;
    }
    const newZoom = s.zoomLevel + diff * 0.15;
    // Adjust pan to keep the viewport center stable during animation
    const centerX = s.viewportWidth / 2;
    const newPanX =
      centerX - ((centerX - s.panOffset.x) * newZoom) / s.zoomLevel;
    set({
      zoomLevel: newZoom,
      panOffset: { x: newPanX, y: s.panOffset.y },
      needsRender: true,
    });
    return true;
  },

  setPan: (x, y) => set({ panOffset: { x, y }, needsRender: true }),

  panToDate: (dateStr) =>
    set((s) => {
      const pixelAtZero = dateToPixel(dateStr, s.zoomLevel, 0);
      const newPanX = s.viewportWidth / 2 - pixelAtZero;
      return { panOffset: { x: newPanX, y: s.panOffset.y }, needsRender: true };
    }),

  pan: (dx, dy) =>
    set((s) => ({
      panOffset: { x: s.panOffset.x + dx, y: s.panOffset.y + dy },
      needsRender: true,
    })),

  setViewport: (width, height) =>
    set({ viewportWidth: width, viewportHeight: height, needsRender: true }),

  markDirty: () => set({ needsRender: true }),
  markClean: () => set({ needsRender: false }),
}));
