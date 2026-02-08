import { Sparkles, Plus, SkipForward, Pencil } from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/utils";
import { formatDate } from "../../lib/utils";
import type { AiGeneratedEvent } from "../../lib/commands";

interface AiEventSuggestionProps {
  suggestion: AiGeneratedEvent;
  onAdd: (suggestion: AiGeneratedEvent) => void;
  onSkip: (suggestion: AiGeneratedEvent) => void;
  onEditBeforeAdd?: (suggestion: AiGeneratedEvent) => void;
  selected?: boolean;
  onToggle?: () => void;
}

function getConfidenceColor(confidence: number): string {
  if (confidence < 0.3) return "bg-red-500";
  if (confidence < 0.6) return "bg-yellow-500";
  return "bg-green-500";
}

export function AiEventSuggestion({
  suggestion,
  onAdd,
  onSkip,
  onEditBeforeAdd,
  selected,
  onToggle,
}: AiEventSuggestionProps) {
  const confidence = suggestion.confidence ?? 0;
  const confidencePercent = Math.round(confidence * 100);
  const barColor = getConfidenceColor(confidence);

  return (
    <div className="border border-border rounded-lg p-3 bg-bg-secondary">
      <div className="flex items-start gap-2 mb-2">
        {onToggle !== undefined && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={onToggle}
            className="mt-1 shrink-0 cursor-pointer accent-accent"
          />
        )}
        <Sparkles size={14} className="text-accent mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text">{suggestion.title}</p>
          <p className="text-[10px] text-text-muted">
            {formatDate(suggestion.startDate)}
            {suggestion.endDate && ` - ${formatDate(suggestion.endDate)}`}
          </p>
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {confidencePercent}%
        </span>
      </div>
      {suggestion.description && (
        <p className="text-[10px] text-text-secondary mb-2 line-clamp-2">
          {suggestion.description}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
        <Button size="sm" variant="primary" onClick={() => onAdd(suggestion)}>
          <Plus size={12} className="mr-1" />
          Add
        </Button>
        {onEditBeforeAdd && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEditBeforeAdd(suggestion)}
            title="Edit before adding"
          >
            <Pencil size={12} />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onSkip(suggestion)}>
          <SkipForward size={12} className="mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
}
