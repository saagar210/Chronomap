import { create } from "zustand";
import { ZOOM_LIMITS } from "../lib/constants";

interface CanvasStore {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  needsRender: boolean;

  setZoom: (zoom: number) => void;
  zoomAtPoint: (delta: number, screenX: number) => void;
  setPan: (x: number, y: number) => void;
  pan: (dx: number, dy: number) => void;
  setViewport: (width: number, height: number) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  viewportWidth: 0,
  viewportHeight: 0,
  needsRender: true,

  setZoom: (zoom) =>
    set({
      zoomLevel: Math.max(ZOOM_LIMITS.min, Math.min(ZOOM_LIMITS.max, zoom)),
      needsRender: true,
    }),

  zoomAtPoint: (delta, screenX) =>
    set((s) => {
      const factor = delta > 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(
        ZOOM_LIMITS.min,
        Math.min(ZOOM_LIMITS.max, s.zoomLevel * factor)
      );
      // Keep the point under cursor fixed
      const newPanX =
        screenX - ((screenX - s.panOffset.x) * newZoom) / s.zoomLevel;
      return {
        zoomLevel: newZoom,
        panOffset: { x: newPanX, y: s.panOffset.y },
        needsRender: true,
      };
    }),

  setPan: (x, y) => set({ panOffset: { x, y }, needsRender: true }),

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
