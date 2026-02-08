/**
 * Pure rendering class — takes canvas context + data, draws the timeline.
 * No React dependency. No state management.
 */
import { dateToPixel, generateAxisLabels } from "../../lib/canvas-math";
import { TRACK_HEIGHT, AXIS_HEIGHT } from "../../lib/constants";
import type { TimelineEvent, Track, Connection, ConnectionType } from "../../lib/types";

export interface EventRect {
  eventId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  zoom: number;
  panX: number;
  panY: number;
  tracks: Track[];
  events: TimelineEvent[];
  connections: Connection[];
  selectedEventId: string | null;
  selectedEventIds: Set<string>;
  selectedConnectionId: string | null;
  highlightedEventIds: Set<string> | null;
  colors: {
    bg: string;
    trackAlt: string;
    grid: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
  };
}

export class CanvasRenderer {
  private eventRects: EventRect[] = [];

  getEventRects(): EventRect[] {
    return this.eventRects;
  }

  /**
   * Hit test: find event under cursor coordinates.
   */
  hitTest(x: number, y: number): string | null {
    // Search in reverse (top-drawn items first)
    for (let i = this.eventRects.length - 1; i >= 0; i--) {
      const r = this.eventRects[i];
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return r.eventId;
      }
    }
    return null;
  }

  /**
   * Get track index from y coordinate.
   */
  getTrackAtY(y: number, tracks: Track[]): string | null {
    const visibleTracks = tracks.filter((t) => t.visible);
    for (let i = 0; i < visibleTracks.length; i++) {
      const trackY = i * TRACK_HEIGHT;
      if (y >= trackY && y < trackY + TRACK_HEIGHT) {
        return visibleTracks[i].id;
      }
    }
    return null;
  }

  render(params: RenderParams) {
    const { ctx, width, height, dpr, zoom, panX, panY, tracks, events, connections, selectedEventId, selectedEventIds, selectedConnectionId, highlightedEventIds, colors } = params;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const visibleTracks = tracks.filter((t) => t.visible);
    const canvasHeight = height - AXIS_HEIGHT;

    this.eventRects = [];

    // Draw track lanes
    this.drawTrackLanes(ctx, width, visibleTracks, panY, colors);

    // Draw events
    this.drawEvents(ctx, zoom, panX, panY, visibleTracks, events, selectedEventId, selectedEventIds, highlightedEventIds, colors);

    // Draw connections
    this.drawConnections(ctx, connections, selectedConnectionId, colors);

    // Draw axis
    this.drawAxis(ctx, width, canvasHeight, zoom, panX, colors);

    // Draw today marker
    this.drawTodayMarker(ctx, zoom, panX, canvasHeight, colors);
  }

  hitTestConnection(x: number, y: number): string | null {
    for (const conn of this._connectionPaths) {
      for (let i = 0; i < conn.segments.length - 1; i++) {
        const dist = pointToSegmentDist(
          x, y,
          conn.segments[i][0], conn.segments[i][1],
          conn.segments[i + 1][0], conn.segments[i + 1][1]
        );
        if (dist < 6) return conn.id;
      }
    }
    return null;
  }

  private _connectionPaths: Array<{ id: string; segments: [number, number][] }> = [];

  private drawConnections(
    ctx: CanvasRenderingContext2D,
    connections: Connection[],
    selectedConnectionId: string | null,
    colors: { text: string; accent: string; textSecondary: string }
  ) {
    this._connectionPaths = [];

    for (const conn of connections) {
      const sourceRect = this.eventRects.find((r) => r.eventId === conn.sourceEventId);
      const targetRect = this.eventRects.find((r) => r.eventId === conn.targetEventId);
      if (!sourceRect || !targetRect) continue;

      const sx = sourceRect.x + sourceRect.width;
      const sy = sourceRect.y + sourceRect.height / 2;
      const tx = targetRect.x;
      const ty = targetRect.y + targetRect.height / 2;
      const cpx1 = sx + (tx - sx) * 0.4;
      const cpx2 = sx + (tx - sx) * 0.6;

      const isSelected = conn.id === selectedConnectionId;
      const style = connectionStyle(conn.connectionType, conn.color);

      ctx.strokeStyle = isSelected ? colors.accent : style.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash(style.dash);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(cpx1, sy, cpx2, ty, tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const angle = Math.atan2(ty - (cpx2 < tx ? ty : sy), tx - cpx2);
      const arrowLen = 8;
      ctx.fillStyle = isSelected ? colors.accent : style.color;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - arrowLen * Math.cos(angle - 0.35), ty - arrowLen * Math.sin(angle - 0.35));
      ctx.lineTo(tx - arrowLen * Math.cos(angle + 0.35), ty - arrowLen * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fill();

      // Label at midpoint
      if (conn.label) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2 - 6;
        ctx.fillStyle = colors.textSecondary;
        ctx.font = "9px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(conn.label, mx, my);
      }

      // Store path for hit testing (approximate Bezier as 10 segments)
      const segments: [number, number][] = [];
      for (let t = 0; t <= 1; t += 0.1) {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const px = mt3 * sx + 3 * mt2 * t * cpx1 + 3 * mt * t2 * cpx2 + t3 * tx;
        const py = mt3 * sy + 3 * mt2 * t * sy + 3 * mt * t2 * ty + t3 * ty;
        segments.push([px, py]);
      }
      this._connectionPaths.push({ id: conn.id, segments });
    }
  }

  private drawTrackLanes(
    ctx: CanvasRenderingContext2D,
    width: number,
    tracks: Track[],
    panY: number,
    colors: { bg: string; trackAlt: string; grid: string; textMuted: string }
  ) {
    for (let i = 0; i < tracks.length; i++) {
      const y = i * TRACK_HEIGHT + panY;

      // Alternating background
      if (i % 2 === 1) {
        ctx.fillStyle = colors.trackAlt;
        ctx.fillRect(0, y, width, TRACK_HEIGHT);
      }

      // Track separator line
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + TRACK_HEIGHT);
      ctx.lineTo(width, y + TRACK_HEIGHT);
      ctx.stroke();
    }
  }

  private drawEvents(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    panX: number,
    panY: number,
    tracks: Track[],
    events: TimelineEvent[],
    selectedEventId: string | null,
    selectedEventIds: Set<string>,
    highlightedEventIds: Set<string> | null,
    colors: { text: string; textSecondary: string; accent: string }
  ) {
    const trackIndexMap = new Map<string, number>();
    tracks.forEach((t, i) => trackIndexMap.set(t.id, i));

    // Sort: eras first, then ranges, then points, then milestones
    const typeOrder: Record<string, number> = { era: 0, range: 1, point: 2, milestone: 3 };
    const sorted = [...events].sort(
      (a, b) => (typeOrder[a.eventType] ?? 2) - (typeOrder[b.eventType] ?? 2)
    );

    for (const event of sorted) {
      const trackIdx = trackIndexMap.get(event.trackId);
      if (trackIdx === undefined) continue;

      const shouldFade = highlightedEventIds !== null && !highlightedEventIds.has(event.id);
      if (shouldFade) ctx.globalAlpha = 0.2;

      const x = dateToPixel(event.startDate, zoom, panX);
      const trackY = trackIdx * TRACK_HEIGHT + panY;
      const centerY = trackY + TRACK_HEIGHT / 2;
      const eventColor = event.color || tracks[trackIdx]?.color || colors.accent;
      const isSelected = event.id === selectedEventId || selectedEventIds.has(event.id);

      // Level-of-detail based on zoom
      if (zoom < 0.1) {
        // Far zoom: just colored dots
        this.drawDot(ctx, event, x, centerY, eventColor, isSelected, colors);
      } else if (zoom <= 1.0) {
        // Medium zoom: dots + truncated title
        this.drawDotWithLabel(ctx, event, x, centerY, eventColor, isSelected, colors);
      } else {
        // Close zoom: full detail
        switch (event.eventType) {
          case "era":
            this.drawEra(ctx, event, x, zoom, panX, trackY, eventColor);
            break;
          case "range":
            this.drawRange(ctx, event, x, zoom, panX, centerY, eventColor, isSelected, colors);
            break;
          case "milestone":
            this.drawMilestone(ctx, event, x, centerY, eventColor, isSelected, colors);
            break;
          default:
            this.drawPoint(ctx, event, x, centerY, eventColor, isSelected, colors);
            break;
        }
      }

      if (shouldFade) ctx.globalAlpha = 1;
    }
  }

  private drawDot(
    ctx: CanvasRenderingContext2D,
    event: TimelineEvent,
    x: number,
    centerY: number,
    color: string,
    isSelected: boolean,
    colors: { accent: string }
  ) {
    const radius = 3 + event.importance * 0.5;

    if (isSelected) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, centerY, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    this.eventRects.push({
      eventId: event.id,
      x: x - radius,
      y: centerY - radius,
      width: radius * 2,
      height: radius * 2,
    });
  }

  private drawDotWithLabel(
    ctx: CanvasRenderingContext2D,
    event: TimelineEvent,
    x: number,
    centerY: number,
    color: string,
    isSelected: boolean,
    colors: { text: string; accent: string }
  ) {
    const radius = 4 + event.importance * 0.5;

    if (isSelected) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, centerY, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Truncated title (max 15 chars)
    const label = event.title.length > 15
      ? event.title.slice(0, 15) + "\u2026"
      : event.title;
    ctx.fillStyle = colors.text;
    ctx.font = `${isSelected ? "bold " : ""}10px -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(label, x + radius + 3, centerY + 3);

    this.eventRects.push({
      eventId: event.id,
      x: x - radius,
      y: centerY - radius,
      width: radius * 2 + ctx.measureText(label).width + 6,
      height: radius * 2,
    });
  }

  private drawPoint(
    ctx: CanvasRenderingContext2D,
    event: TimelineEvent,
    x: number,
    centerY: number,
    color: string,
    isSelected: boolean,
    colors: { text: string; accent: string }
  ) {
    const radius = 5 + event.importance;

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, centerY, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = colors.text;
    ctx.font = `${isSelected ? "bold " : ""}11px -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(event.title, x + radius + 4, centerY + 4);

    this.eventRects.push({
      eventId: event.id,
      x: x - radius,
      y: centerY - radius,
      width: radius * 2 + ctx.measureText(event.title).width + 8,
      height: radius * 2,
    });
  }

  private drawRange(
    ctx: CanvasRenderingContext2D,
    event: TimelineEvent,
    startX: number,
    zoom: number,
    panX: number,
    centerY: number,
    color: string,
    isSelected: boolean,
    colors: { text: string; accent: string }
  ) {
    const endX = event.endDate
      ? dateToPixel(event.endDate, zoom, panX)
      : startX + 50;
    const barWidth = Math.max(endX - startX, 4);
    const barHeight = 20 + event.importance * 2;
    const y = centerY - barHeight / 2;
    const radius = 4;

    if (isSelected) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      this.roundRect(ctx, startX - 2, y - 2, barWidth + 4, barHeight + 4, radius + 1);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    this.roundRect(ctx, startX, y, barWidth, barHeight, radius);
    ctx.fill();

    // Title centered in bar
    ctx.fillStyle = this.contrastText(color);
    ctx.font = "bold 10px -apple-system, sans-serif";
    ctx.textAlign = "center";
    const maxTextWidth = barWidth - 8;
    const title = this.truncateText(ctx, event.title, maxTextWidth);
    ctx.fillText(title, startX + barWidth / 2, centerY + 3);

    this.eventRects.push({ eventId: event.id, x: startX, y, width: barWidth, height: barHeight });
  }

  private drawMilestone(
    ctx: CanvasRenderingContext2D,
    event: TimelineEvent,
    x: number,
    centerY: number,
    color: string,
    isSelected: boolean,
    colors: { text: string; accent: string }
  ) {
    const size = 8 + event.importance;

    if (isSelected) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, centerY - size - 3);
      ctx.lineTo(x + size + 3, centerY);
      ctx.lineTo(x, centerY + size + 3);
      ctx.lineTo(x - size - 3, centerY);
      ctx.closePath();
      ctx.stroke();
    }

    // Diamond shape
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, centerY - size);
    ctx.lineTo(x + size, centerY);
    ctx.lineTo(x, centerY + size);
    ctx.lineTo(x - size, centerY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.text;
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(event.title, x + size + 4, centerY + 4);

    this.eventRects.push({
      eventId: event.id,
      x: x - size,
      y: centerY - size,
      width: size * 2 + ctx.measureText(event.title).width + 8,
      height: size * 2,
    });
  }

  private safeHexColor(color: string): string {
    // Ensure color is valid hex before appending opacity suffixes
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
    return "#3b82f6"; // fallback to accent blue
  }

  private drawEra(
    ctx: CanvasRenderingContext2D,
    event: TimelineEvent,
    startX: number,
    zoom: number,
    panX: number,
    trackY: number,
    color: string
  ) {
    const endX = event.endDate
      ? dateToPixel(event.endDate, zoom, panX)
      : startX + 100;
    const width = Math.max(endX - startX, 4);
    const safeColor = this.safeHexColor(color);

    ctx.fillStyle = safeColor + "22"; // very translucent
    ctx.fillRect(startX, trackY, width, TRACK_HEIGHT);

    ctx.strokeStyle = safeColor + "44";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, trackY, width, TRACK_HEIGHT);

    ctx.fillStyle = safeColor + "88";
    ctx.font = "italic 10px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(event.title, startX + width / 2, trackY + 12);

    this.eventRects.push({
      eventId: event.id,
      x: startX,
      y: trackY,
      width,
      height: TRACK_HEIGHT,
    });
  }

  private drawAxis(
    ctx: CanvasRenderingContext2D,
    width: number,
    canvasTop: number,
    zoom: number,
    panX: number,
    colors: { bg: string; grid: string; text: string; textMuted: string }
  ) {
    // Axis background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, canvasTop, width, AXIS_HEIGHT);

    // Top border
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasTop);
    ctx.lineTo(width, canvasTop);
    ctx.stroke();

    // Labels
    const labels = generateAxisLabels(width, zoom, panX);
    ctx.fillStyle = colors.textMuted;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "center";

    for (const { x, label } of labels) {
      if (x >= -50 && x <= width + 50) {
        // Tick mark
        ctx.strokeStyle = colors.grid;
        ctx.beginPath();
        ctx.moveTo(x, canvasTop);
        ctx.lineTo(x, canvasTop + 6);
        ctx.stroke();

        ctx.fillText(label, x, canvasTop + 22);
      }
    }
  }

  private drawTodayMarker(
    ctx: CanvasRenderingContext2D,
    zoom: number,
    panX: number,
    canvasHeight: number,
    colors: { accent: string }
  ) {
    const now = new Date().toISOString();
    const x = dateToPixel(now, zoom, panX);

    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // "Today" label below the line
    ctx.fillStyle = colors.accent;
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Today", x, canvasHeight + 12);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private contrastText(hexColor: string): string {
    const hex = hexColor.replace("#", "");
    if (hex.length < 6) return "#000000";
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return "#000000";
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  private truncateText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string {
    if (maxWidth <= 0) return "";
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + "\u2026").width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "\u2026";
  }
}

function connectionStyle(type: ConnectionType, customColor: string | null): { color: string; dash: number[] } {
  const defaults: Record<ConnectionType, { color: string; dash: number[] }> = {
    caused: { color: "#3b82f6", dash: [] },
    related: { color: "#9ca3af", dash: [6, 4] },
    preceded: { color: "#10b981", dash: [2, 3] },
    influenced: { color: "#f59e0b", dash: [8, 4, 2, 4] },
  };
  const style = defaults[type] ?? defaults.related;
  return { color: customColor ?? style.color, dash: style.dash };
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
