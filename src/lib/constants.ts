export const TRACK_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
] as const;

export const DEFAULT_TRACK_COLOR = TRACK_COLORS[0];

export const EVENT_TYPES = [
  { value: "point", label: "Point" },
  { value: "range", label: "Range" },
  { value: "milestone", label: "Milestone" },
  { value: "era", label: "Era" },
] as const;

export const IMPORTANCE_LEVELS = [1, 2, 3, 4, 5] as const;

export const ZOOM_LIMITS = {
  min: 0.001,
  max: 1000,
  default: 1,
} as const;

export const TRACK_HEIGHT = 60;
export const TRACK_PADDING = 8;
export const AXIS_HEIGHT = 40;
export const SIDEBAR_DEFAULT_WIDTH = 240;
export const DETAIL_PANEL_DEFAULT_WIDTH = 320;
