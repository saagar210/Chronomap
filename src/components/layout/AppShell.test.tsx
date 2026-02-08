import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";
import { invoke } from "@tauri-apps/api/core";

const mockInvoke = vi.mocked(invoke);

describe("AppShell", () => {
  it("renders 3-panel layout", async () => {
    // Mock loadTimelines and loadTheme
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "list_timelines") return [];
      if (cmd === "get_setting") return { key: "theme", value: "system" };
      return null;
    });

    render(<AppShell />);

    expect(screen.getByText("Tracks")).toBeDefined();
    expect(screen.getByText("Welcome to ChronoMap")).toBeDefined();
  });
});
