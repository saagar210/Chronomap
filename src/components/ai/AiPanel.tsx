import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Trash2 } from "lucide-react";
import { Button } from "../common/Button";
import { IconButton } from "../common/IconButton";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EmptyState } from "../common/EmptyState";
import { AiMessage } from "./AiMessage";
import { AiEventSuggestion } from "./AiEventSuggestion";
import { OllamaStatus } from "./OllamaStatus";
import { useAiStore } from "../../stores/ai-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useTrackStore } from "../../stores/track-store";
import type { AiGeneratedEvent } from "../../lib/commands";

interface AiPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AiPanel({ open, onClose }: AiPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    suggestions,
    loading,
    error,
    sendMessage,
    addSuggestionAsEvent,
    clearChat,
  } = useAiStore();

  const activeTimelineId = useTimelineStore((s) => s.activeTimelineId);
  const tracks = useTrackStore((s) => s.tracks);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    sendMessage(trimmed, activeTimelineId ?? undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddSuggestion = (suggestion: AiGeneratedEvent) => {
    if (!activeTimelineId || tracks.length === 0) return;
    addSuggestionAsEvent(suggestion, activeTimelineId, tracks[0].id);
  };

  const handleSkipSuggestion = (suggestion: AiGeneratedEvent) => {
    useAiStore.setState((s) => ({
      suggestions: s.suggestions.filter((sg) => sg !== suggestion),
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-bg border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-accent" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <OllamaStatus />
          <IconButton onClick={clearChat} tooltip="Clear chat">
            <Trash2 size={14} />
          </IconButton>
          <IconButton onClick={onClose} tooltip="Close panel">
            <X size={14} />
          </IconButton>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && suggestions.length === 0 && (
          <EmptyState
            icon={<Bot size={24} />}
            title="AI Assistant"
            description="Ask questions about your timeline or request event suggestions."
          />
        )}
        {messages.map((msg, i) => (
          <AiMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && <LoadingSpinner />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t border-border p-3 max-h-48 overflow-y-auto">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-2">
            Suggested Events ({suggestions.length})
          </p>
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <AiEventSuggestion
                key={i}
                suggestion={suggestion}
                onAdd={handleAddSuggestion}
                onSkip={handleSkipSuggestion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 bg-danger/10 border-t border-danger/20">
          <p className="text-[10px] text-danger">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your timeline..."
            disabled={loading}
            className="flex-1 bg-bg-tertiary rounded-md px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
