import { useRef, useEffect, useCallback } from "react";
import { useCanvas } from "../../hooks/use-canvas";
import { useZoomPan } from "../../hooks/use-zoom-pan";
import { useEventInteraction } from "../../hooks/use-event-interaction";
import { useContextMenu } from "../../hooks/use-context-menu";
import { useCanvasStore } from "../../stores/canvas-store";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { fitAllEvents } from "../../lib/canvas-math";
import { ContextMenu } from "./ContextMenu";
import { Tooltip } from "./Tooltip";

export function TimelineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useCanvas(canvasRef);
  const { isPanning } = useZoomPan(canvasRef);
  const { handleClick, handleDoubleClick, handleMouseDown, handleMouseMove, handleMouseUp } =
    useEventInteraction(canvasRef, rendererRef);
  const { menu, show: showContextMenu, hide: hideContextMenu } = useContextMenu();

  const events = useEventStore((s) => s.events);
  const tracks = useTrackStore((s) => s.tracks);
  const markDirty = useCanvasStore((s) => s.markDirty);

  // Tooltip state
  const tooltipRef = useRef<{ eventId: string | null; x: number; y: number }>({
    eventId: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    markDirty();
  }, [events, tracks, markDirty]);

  // Fit all on first load
  const hasFitted = useRef(false);
  useEffect(() => {
    if (events.length > 0 && !hasFitted.current) {
      hasFitted.current = true;
      const { viewportWidth } = useCanvasStore.getState();
      if (viewportWidth > 0) {
        const { zoom, panOffsetX } = fitAllEvents(events, viewportWidth);
        useCanvasStore.getState().setZoom(zoom);
        useCanvasStore.getState().setPan(panOffsetX, 0);
      }
    }
  }, [events]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const eventId = rendererRef.current?.hitTest(x, y) ?? null;
      if (eventId) {
        useEventStore.getState().selectEvent(eventId);
        markDirty();
      }
      showContextMenu(e.clientX, e.clientY, eventId);
    },
    [showContextMenu, markDirty, rendererRef]
  );

  const handleHover = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMouseMove(e);
      if (isPanning.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const eventId = rendererRef.current?.hitTest(x, y) ?? null;
      tooltipRef.current = { eventId, x: e.clientX, y: e.clientY };
      canvas.style.cursor = eventId ? "pointer" : "grab";
    },
    [handleMouseMove, isPanning, rendererRef]
  );

  const hoveredEvent = events.find(
    (ev) => ev.id === tooltipRef.current.eventId
  );

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleHover}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {hoveredEvent && !menu.visible && (
        <Tooltip
          x={tooltipRef.current.x}
          y={tooltipRef.current.y}
          event={hoveredEvent}
        />
      )}
      {menu.visible && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          eventId={menu.eventId}
          onClose={hideContextMenu}
        />
      )}
    </div>
  );
}
