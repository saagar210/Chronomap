import { formatDate, truncate } from "../../lib/utils";
import type { TimelineEvent } from "../../lib/types";

interface TooltipProps {
  event: TimelineEvent;
  x: number;
  y: number;
}

export function Tooltip({ event, x, y }: TooltipProps) {
  return (
    <div
      className="fixed z-50 bg-bg border border-border rounded-md shadow-lg px-3 py-2 pointer-events-none max-w-[240px]"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="text-sm font-medium">{event.title}</div>
      <div className="text-xs text-text-muted mt-0.5">
        {formatDate(event.startDate)}
        {event.endDate && ` — ${formatDate(event.endDate)}`}
      </div>
      {event.description && (
        <div className="text-xs text-text-secondary mt-1">
          {truncate(event.description, 120)}
        </div>
      )}
      {event.aiGenerated && (
        <div className="text-xs text-accent mt-1">AI Generated</div>
      )}
    </div>
  );
}
