import { describe, it, expect } from "vitest";
import {
  dateToPixel,
  pixelToDate,
  selectLabelTier,
  fitAllEvents,
  parseDateToTimestamp,
} from "./canvas-math";

describe("canvas-math", () => {
  describe("dateToPixel / pixelToDate round trip", () => {
    it("round-trips at zoom 1", () => {
      const dateStr = "2024-06-15";
      const zoom = 1;
      const pan = 500;
      const px = dateToPixel(dateStr, zoom, pan);
      const result = pixelToDate(px, zoom, pan);
      // Should be within a day of the original
      const original = new Date("2024-06-15").getTime();
      expect(Math.abs(result.getTime() - original)).toBeLessThan(86_400_000);
    });

    it("round-trips at high zoom", () => {
      const dateStr = "2024-06-15T12:00:00";
      const zoom = 100;
      const pan = 0;
      const px = dateToPixel(dateStr, zoom, pan);
      const result = pixelToDate(px, zoom, pan);
      const original = new Date(dateStr).getTime();
      // Within an hour at high zoom
      expect(Math.abs(result.getTime() - original)).toBeLessThan(3_600_000);
    });
  });

  describe("parseDateToTimestamp", () => {
    it("parses year-only", () => {
      const ts = parseDateToTimestamp("2024");
      const d = new Date(ts);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(6); // July (midpoint)
    });

    it("parses year-month", () => {
      const ts = parseDateToTimestamp("2024-06");
      const d = new Date(ts);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(5); // June
    });

    it("parses full date", () => {
      const ts = parseDateToTimestamp("2024-06-15");
      const d = new Date(ts);
      expect(d.getFullYear()).toBe(2024);
    });
  });

  describe("selectLabelTier", () => {
    it("returns century at very low zoom", () => {
      const tier = selectLabelTier(0.001);
      expect(tier.tier).toBe("century");
    });

    it("returns year at moderate zoom", () => {
      const tier = selectLabelTier(1);
      expect(["year", "month", "decade"]).toContain(tier.tier);
    });

    it("returns day or hour at high zoom", () => {
      const tier = selectLabelTier(500);
      expect(["day", "hour"]).toContain(tier.tier);
    });
  });

  describe("fitAllEvents", () => {
    it("returns centered view for events", () => {
      const events = [
        { startDate: "2024-01-01", endDate: "2024-12-31" },
        { startDate: "2024-06-15" },
      ];
      const { zoom, panOffsetX } = fitAllEvents(events, 1000);
      expect(zoom).toBeGreaterThan(0);
      expect(typeof panOffsetX).toBe("number");
    });

    it("handles empty events", () => {
      const { zoom, panOffsetX } = fitAllEvents([], 1000);
      expect(zoom).toBe(1);
      expect(panOffsetX).toBe(500);
    });
  });
});
