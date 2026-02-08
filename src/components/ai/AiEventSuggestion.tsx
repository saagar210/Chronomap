import { Sparkles, Plus, SkipForward } from "lucide-react";
import { Button } from "../common/Button";
import { formatDate } from "../../lib/utils";
import type { AiGeneratedEvent } from "../../lib/commands";

interface AiEventSuggestionProps {
  suggestion: AiGeneratedEvent;
  onAdd: (suggestion: AiGeneratedEvent) => void;
  onSkip: (suggestion: AiGeneratedEvent) => void;
}

export function AiEventSuggestion({
  suggestion,
  onAdd,
  onSkip,
}: AiEventSuggestionProps) {
  const confidence = suggestion.confidence ?? 0;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="border border-border rounded-lg p-3 bg-bg-secondary">
      <div className="flex items-start gap-2 mb-2">
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
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
        <Button size="sm" variant="primary" onClick={() => onAdd(suggestion)}>
          <Plus size={12} className="mr-1" />
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onSkip(suggestion)}>
          <SkipForward size={12} className="mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
}
