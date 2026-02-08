import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "./toast-store";

describe("useToastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a toast", () => {
    useToastStore.getState().addToast({ type: "success", title: "Done" });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].title).toBe("Done");
  });

  it("auto-removes toast after duration", () => {
    useToastStore.getState().addToast({ type: "info", title: "Info", duration: 1000 });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1100);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("manually removes a toast", () => {
    useToastStore.getState().addToast({ type: "warning", title: "Warn" });
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("caps at 5 toasts", () => {
    for (let i = 0; i < 7; i++) {
      useToastStore.getState().addToast({ type: "info", title: `Toast ${i}` });
    }
    expect(useToastStore.getState().toasts.length).toBeLessThanOrEqual(5);
  });

  it("errors default to 6s duration", () => {
    useToastStore.getState().addToast({ type: "error", title: "Err" });
    vi.advanceTimersByTime(3500);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
