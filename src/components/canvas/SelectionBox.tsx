import { useEffect, useRef, useState } from "react";

interface SelectionBoxProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onSelect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function SelectionBox({ canvasRef, onSelect }: SelectionBoxProps) {
  const [box, setBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!e.shiftKey || e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      dragging.current = true;
      setBox({ startX: x, startY: y, currentX: x, currentY: y });
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBox((prev) => prev ? { ...prev, currentX: x, currentY: y } : null);
    };

    const handleMouseUp = () => {
      if (!dragging.current || !box) {
        dragging.current = false;
        setBox(null);
        return;
      }
      dragging.current = false;

      const left = Math.min(box.startX, box.currentX);
      const top = Math.min(box.startY, box.currentY);
      const width = Math.abs(box.currentX - box.startX);
      const height = Math.abs(box.currentY - box.startY);

      if (width > 5 && height > 5) {
        onSelect({ x: left, y: top, width, height });
      }
      setBox(null);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasRef, box, onSelect]);

  if (!box) return null;

  const left = Math.min(box.startX, box.currentX);
  const top = Math.min(box.startY, box.currentY);
  const width = Math.abs(box.currentX - box.startX);
  const height = Math.abs(box.currentY - box.startY);

  return (
    <div
      className="absolute pointer-events-none border-2 border-accent bg-accent/10 rounded-sm"
      style={{ left, top, width, height }}
    />
  );
}
