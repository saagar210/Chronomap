import { useRef, useEffect, useCallback, useState } from "react";
import { useCanvas } from "../../hooks/use-canvas";
import { useZoomPan } from "../../hooks/use-zoom-pan";
import { useEventInteraction } from "../../hooks/use-event-interaction";
import { useContextMenu } from "../../hooks/use-context-menu";
import { useCanvasStore } from "../../stores/canvas-store";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { useConnectionStore } from "../../stores/connection-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { fitAllEvents, pixelToDate } from "../../lib/canvas-math";
import { ContextMenu } from "./ContextMenu";
import { Tooltip } from "./Tooltip";
import { SelectionBox } from "./SelectionBox";
import { BulkActions } from "../events/BulkActions";
import { ConnectionForm } from "../connections/ConnectionForm";
import { QuickCreate } from "../events/QuickCreate";
import type { ConnectionType } from "../../lib/types";

export function TimelineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useCanvas(canvasRef);
  const { isPanning } = useZoomPan(canvasRef);
  const { handleClick: baseHandleClick, handleDoubleClick, handleMouseDown, handleMouseMove, handleMouseUp } =
    useEventInteraction(canvasRef, rendererRef);
  const { menu, show: showContextMenu, hide: hideContextMenu } = useContextMenu();

  const events = useEventStore((s) => s.events);
  const tracks = useTrackStore((s) => s.tracks);
  const connections = useConnectionStore((s) => s.connections);
  const markDirty = useCanvasStore((s) => s.markDirty);

  // Connect mode
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectTarget, setConnectTarget] = useState<string | null>(null);

  // QuickCreate state
  const [quickCreate, setQuickCreate] = useState<{
    x: number;
    y: number;
    date: string;
  } | null>(null);

  // Tooltip state
  const tooltipRef = useRef<{ eventId: string | null; x: number; y: number }>({
    eventId: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    markDirty();
  }, [events, tracks, connections, markDirty]);

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

  const handleStartConnect = useCallback((eventId: string) => {
    setConnectSource(eventId);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // If in connect mode, clicking an event completes the connection
      if (connectSource) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const targetId = rendererRef.current?.hitTest(x, y) ?? null;
        if (targetId && targetId !== connectSource) {
          setConnectTarget(targetId);
          setShowConnectionForm(true);
        }
        setConnectSource(null);
        return;
      }

      // Shift+click for multi-select
      if (e.shiftKey) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const eventId = rendererRef.current?.hitTest(x, y) ?? null;
        if (eventId) {
          useEventStore.getState().toggleEventSelection(eventId);
          markDirty();
          return;
        }
      }

      // Check for connection click
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const connId = rendererRef.current?.hitTestConnection(x, y) ?? null;
        if (connId) {
          useConnectionStore.getState().selectConnection(connId);
          markDirty();
          return;
        }
      }

      baseHandleClick(e);
    },
    [connectSource, baseHandleClick, rendererRef, markDirty]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const eventId = rendererRef.current?.hitTest(x, y) ?? null;
      if (eventId) {
        // Hit an event: use existing double-click behavior
        handleDoubleClick(e);
      } else {
        // Empty space: show QuickCreate
        const { zoomLevel, panOffset } = useCanvasStore.getState();
        const date = pixelToDate(x, zoomLevel, panOffset.x);
        const dateStr = date.toISOString().split("T")[0];
        setQuickCreate({ x, y, date: dateStr });
      }
    },
    [handleDoubleClick, rendererRef]
  );

  const handleBoxSelect = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      const rects = rendererRef.current?.getEventRects() ?? [];
      const ids = rects
        .filter((r) => {
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          return cx >= rect.x && cx <= rect.x + rect.width && cy >= rect.y && cy <= rect.y + rect.height;
        })
        .map((r) => r.eventId);
      if (ids.length > 0) {
        useEventStore.getState().selectEventsInRange(ids);
        markDirty();
      }
    },
    [rendererRef, markDirty]
  );

  const handleConnectionSubmit = useCallback(
    async (data: { label: string; connectionType: ConnectionType; color: string | null }) => {
      const timelineId = useTimelineStore.getState().activeTimelineId;
      if (!connectSource || !connectTarget || !timelineId) return;
      await useConnectionStore.getState().createConnection({
        timelineId,
        sourceEventId: connectSource,
        targetEventId: connectTarget,
        connectionType: data.connectionType,
        label: data.label || undefined,
        color: data.color ?? undefined,
      });
      markDirty();
      setConnectSource(null);
      setConnectTarget(null);
    },
    [connectSource, connectTarget, markDirty]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (connectSource) {
        setConnectSource(null);
        return;
      }
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
    [showContextMenu, markDirty, rendererRef, connectSource]
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

      if (connectSource) {
        canvas.style.cursor = eventId && eventId !== connectSource ? "crosshair" : "crosshair";
      } else {
        canvas.style.cursor = eventId ? "pointer" : "grab";
      }
    },
    [handleMouseMove, isPanning, rendererRef, connectSource]
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
        onDoubleClick={handleCanvasDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleHover}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {connectSource && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-sm shadow-lg">
          Click a target event to connect (Esc to cancel)
        </div>
      )}
      {hoveredEvent && !menu.visible && !connectSource && (
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
          onStartConnect={handleStartConnect}
        />
      )}
      {quickCreate && (
        <QuickCreate
          x={quickCreate.x}
          y={quickCreate.y}
          date={quickCreate.date}
          onClose={() => setQuickCreate(null)}
        />
      )}
      <SelectionBox canvasRef={canvasRef} onSelect={handleBoxSelect} />
      <BulkActions />
      <ConnectionForm
        open={showConnectionForm}
        onClose={() => {
          setShowConnectionForm(false);
          setConnectSource(null);
          setConnectTarget(null);
        }}
        onSubmit={handleConnectionSubmit}
      />
    </div>
  );
}
