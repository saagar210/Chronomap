import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeDefined();
  });

  it("fires click handler", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("applies primary variant styles", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-accent");
    expect(btn.className).toContain("text-white");
  });

  it("applies secondary variant styles (default)", () => {
    render(<Button>Secondary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-bg-tertiary");
  });

  it("applies ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-transparent");
  });

  it("applies danger variant styles", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-danger");
    expect(btn.className).toContain("text-white");
  });

  it("applies sm size styles", () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-xs");
    expect(btn.className).toContain("px-2");
  });

  it("applies md size styles (default)", () => {
    render(<Button>Medium</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-sm");
    expect(btn.className).toContain("px-3");
  });

  it("merges custom className", () => {
    render(<Button className="my-custom-class">Styled</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("my-custom-class");
  });

  it("supports disabled state", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("passes through HTML button attributes", () => {
    render(<Button type="submit">Submit</Button>);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("type")).toBe("submit");
  });
});
