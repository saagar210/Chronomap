/**
 * Canvas coordinate math — bidirectional date↔pixel transforms.
 *
 * Coordinate system:
 * - Reference point: Unix epoch (1970-01-01) maps to pixel 0
 * - Scale: pixelsPerDay * zoomLevel
 * - panOffset shifts the entire view in pixel space
 */

const MS_PER_DAY = 86_400_000;
const EPOCH = new Date("1970-01-01T00:00:00Z").getTime();
const BASE_PIXELS_PER_DAY = 0.5; // At zoom 1, 1 day = 0.5px

export function dateToPixel(
  dateStr: string,
  zoom: number,
  panOffsetX: number
): number {
  const ts = parseDateToTimestamp(dateStr);
  const daysSinceEpoch = (ts - EPOCH) / MS_PER_DAY;
  return daysSinceEpoch * BASE_PIXELS_PER_DAY * zoom + panOffsetX;
}

export function pixelToDate(
  px: number,
  zoom: number,
  panOffsetX: number
): Date {
  const daysSinceEpoch = (px - panOffsetX) / (BASE_PIXELS_PER_DAY * zoom);
  return new Date(EPOCH + daysSinceEpoch * MS_PER_DAY);
}

export function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr) return Date.now();

  // Year only: "2024" → Jul 1 of that year
  if (/^\d{1,4}$/.test(dateStr)) {
    return new Date(Number(dateStr), 6, 1).getTime();
  }

  // Year-month: "2024-06" → 15th of that month
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, 15).getTime();
  }

  // Full date or datetime
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

export function getVisibleDateRange(
  viewportWidth: number,
  zoom: number,
  panOffsetX: number
): { start: Date; end: Date } {
  return {
    start: pixelToDate(0, zoom, panOffsetX),
    end: pixelToDate(viewportWidth, zoom, panOffsetX),
  };
}

/**
 * Determine the time axis label tier based on zoom level.
 * Returns the best granularity where labels are >= 80px apart.
 */
export type LabelTier =
  | "century"
  | "decade"
  | "year"
  | "month"
  | "day"
  | "hour";

interface TierConfig {
  tier: LabelTier;
  daysPerUnit: number;
  format: (d: Date) => string;
}

const TIERS: TierConfig[] = [
  {
    tier: "century",
    daysPerUnit: 36525,
    format: (d) => `${Math.floor(d.getFullYear() / 100) * 100}s`,
  },
  {
    tier: "decade",
    daysPerUnit: 3652.5,
    format: (d) => `${Math.floor(d.getFullYear() / 10) * 10}s`,
  },
  {
    tier: "year",
    daysPerUnit: 365.25,
    format: (d) => `${d.getFullYear()}`,
  },
  {
    tier: "month",
    daysPerUnit: 30.44,
    format: (d) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    },
  },
  {
    tier: "day",
    daysPerUnit: 1,
    format: (d) => `${d.getMonth() + 1}/${d.getDate()}`,
  },
  {
    tier: "hour",
    daysPerUnit: 1 / 24,
    format: (d) =>
      `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
  },
];

const MIN_LABEL_SPACING = 80;

export function selectLabelTier(zoom: number): TierConfig {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const pxPerUnit = TIERS[i].daysPerUnit * BASE_PIXELS_PER_DAY * zoom;
    if (pxPerUnit >= MIN_LABEL_SPACING) {
      return TIERS[i];
    }
  }
  return TIERS[0]; // fallback to century
}

/**
 * Generate axis label positions for a viewport.
 */
export function generateAxisLabels(
  viewportWidth: number,
  zoom: number,
  panOffsetX: number
): Array<{ x: number; label: string }> {
  const tier = selectLabelTier(zoom);
  const { start, end } = getVisibleDateRange(viewportWidth, zoom, panOffsetX);
  const labels: Array<{ x: number; label: string }> = [];

  // Extend range slightly for edge labels
  const margin = tier.daysPerUnit * MS_PER_DAY;
  const rangeStart = start.getTime() - margin;
  const rangeEnd = end.getTime() + margin;

  let current: Date;

  switch (tier.tier) {
    case "century":
      current = new Date(
        Math.floor(start.getFullYear() / 100) * 100,
        0,
        1
      );
      while (current.getTime() < rangeEnd) {
        if (current.getTime() >= rangeStart) {
          const x = dateToPixel(current.toISOString(), zoom, panOffsetX);
          labels.push({ x, label: tier.format(current) });
        }
        current = new Date(current.getFullYear() + 100, 0, 1);
      }
      break;
    case "decade":
      current = new Date(
        Math.floor(start.getFullYear() / 10) * 10,
        0,
        1
      );
      while (current.getTime() < rangeEnd) {
        if (current.getTime() >= rangeStart) {
          const x = dateToPixel(current.toISOString(), zoom, panOffsetX);
          labels.push({ x, label: tier.format(current) });
        }
        current = new Date(current.getFullYear() + 10, 0, 1);
      }
      break;
    case "year":
      current = new Date(start.getFullYear(), 0, 1);
      while (current.getTime() < rangeEnd) {
        if (current.getTime() >= rangeStart) {
          const x = dateToPixel(current.toISOString(), zoom, panOffsetX);
          labels.push({ x, label: tier.format(current) });
        }
        current = new Date(current.getFullYear() + 1, 0, 1);
      }
      break;
    case "month":
      current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current.getTime() < rangeEnd) {
        if (current.getTime() >= rangeStart) {
          const x = dateToPixel(current.toISOString(), zoom, panOffsetX);
          labels.push({ x, label: tier.format(current) });
        }
        current = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        );
      }
      break;
    case "day":
      current = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      while (current.getTime() < rangeEnd) {
        if (current.getTime() >= rangeStart) {
          const x = dateToPixel(current.toISOString(), zoom, panOffsetX);
          labels.push({ x, label: tier.format(current) });
        }
        current = new Date(current.getTime() + MS_PER_DAY);
      }
      break;
    case "hour":
      current = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
        start.getHours()
      );
      while (current.getTime() < rangeEnd) {
        if (current.getTime() >= rangeStart) {
          const x = dateToPixel(current.toISOString(), zoom, panOffsetX);
          labels.push({ x, label: tier.format(current) });
        }
        current = new Date(current.getTime() + 3600000);
      }
      break;
  }

  return labels;
}

/**
 * Calculate zoom and offset to fit all events in the viewport.
 */
export function fitAllEvents(
  events: Array<{ startDate: string; endDate?: string | null }>,
  viewportWidth: number
): { zoom: number; panOffsetX: number } {
  if (events.length === 0) {
    return { zoom: 1, panOffsetX: viewportWidth / 2 };
  }

  let minTs = Infinity;
  let maxTs = -Infinity;

  for (const ev of events) {
    const start = parseDateToTimestamp(ev.startDate);
    minTs = Math.min(minTs, start);
    if (ev.endDate) {
      maxTs = Math.max(maxTs, parseDateToTimestamp(ev.endDate));
    } else {
      maxTs = Math.max(maxTs, start);
    }
  }

  // Add 5% padding
  const range = maxTs - minTs || MS_PER_DAY * 365;
  const paddedRange = range * 1.1;
  const daysRange = paddedRange / MS_PER_DAY;

  const zoom = viewportWidth / (daysRange * BASE_PIXELS_PER_DAY);
  const centerDays = ((minTs + maxTs) / 2 - EPOCH) / MS_PER_DAY;
  const panOffsetX =
    viewportWidth / 2 - centerDays * BASE_PIXELS_PER_DAY * zoom;

  return { zoom, panOffsetX };
}
