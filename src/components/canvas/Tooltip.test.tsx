import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";
import type { TimelineEvent } from "../../lib/types";

const mockEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: "e1",
  timelineId: "tl1",
  trackId: "t1",
  title: "Moon Landing",
  description: "First humans walked on the Moon",
  startDate: "1969-07-20",
  endDate: null,
  eventType: "point",
  importance: 5,
  color: null,
  icon: null,
  imagePath: null,
  externalLink: null,
  tags: "",
  source: null,
  aiGenerated: false,
  aiConfidence: null,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ...overrides,
});

describe("Tooltip", () => {
  it("renders event title", () => {
    render(<Tooltip event={mockEvent()} x={100} y={200} />);
    expect(screen.getByText("Moon Landing")).toBeDefined();
  });

  it("renders formatted start date", () => {
    render(<Tooltip event={mockEvent()} x={100} y={200} />);
    // formatDate("1969-07-20") => "Jul 20, 1969"
    expect(screen.getByText("Jul 20, 1969")).toBeDefined();
  });

  it("renders end date when present", () => {
    render(
      <Tooltip
        event={mockEvent({ endDate: "1969-07-21" })}
        x={100}
        y={200}
      />
    );
    // Should contain both dates with em dash separator
    const dateEl = screen.getByText(/Jul 20, 1969/);
    expect(dateEl.textContent).toContain("Jul 21, 1969");
  });

  it("renders truncated description", () => {
    render(<Tooltip event={mockEvent()} x={100} y={200} />);
    expect(screen.getByText("First humans walked on the Moon")).toBeDefined();
  });

  it("does not render description when empty", () => {
    render(
      <Tooltip event={mockEvent({ description: "" })} x={100} y={200} />
    );
    // Only title and date should be present
    expect(screen.getByText("Moon Landing")).toBeDefined();
    expect(screen.queryByText("First humans walked on the Moon")).toBeNull();
  });

  it("shows AI Generated badge for AI events", () => {
    render(
      <Tooltip event={mockEvent({ aiGenerated: true })} x={100} y={200} />
    );
    expect(screen.getByText("AI Generated")).toBeDefined();
  });

  it("does not show AI Generated badge for non-AI events", () => {
    render(<Tooltip event={mockEvent()} x={100} y={200} />);
    expect(screen.queryByText("AI Generated")).toBeNull();
  });

  it("positions tooltip offset from cursor", () => {
    const { container } = render(
      <Tooltip event={mockEvent()} x={100} y={200} />
    );
    const tooltip = container.firstElementChild as HTMLElement;
    expect(tooltip.style.left).toBe("112px");
    expect(tooltip.style.top).toBe("212px");
  });
});
