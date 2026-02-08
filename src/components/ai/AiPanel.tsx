import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Send,
  Bot,
  Trash2,
  Settings,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../common/Button";
import { IconButton } from "../common/IconButton";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EmptyState } from "../common/EmptyState";
import { AiMessage } from "./AiMessage";
import { AiEventSuggestion } from "./AiEventSuggestion";
import { AiBatchActions } from "./AiBatchActions";
import { AiSettings } from "./AiSettings";
import { OllamaStatus } from "./OllamaStatus";
import { useAiStore } from "../../stores/ai-store";
import { useTimelineStore } from "../../stores/timeline-store";
import { useTrackStore } from "../../stores/track-store";
import { useEventStore } from "../../stores/event-store";
import { useUiStore } from "../../stores/ui-store";
import { useToastStore } from "../../stores/toast-store";
import * as cmd from "../../lib/commands";
import type { AiGeneratedEvent } from "../../lib/commands";

interface AiPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AiPanel({ open, onClose }: AiPanelProps) {
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
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
  const timelines = useTimelineStore((s) => s.timelines);
  const tracks = useTrackStore((s) => s.tracks);
  const events = useEventStore((s) => s.events);
  const selectedEventId = useEventStore((s) => s.selectedEventId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndices(new Set());
  }, [suggestions.length]);

  const buildTimelineContext = useCallback((): string | undefined => {
    if (!activeTimelineId) return undefined;
    const timeline = timelines.find((t) => t.id === activeTimelineId);
    if (!timeline) return undefined;

    const eventSummaries = events
      .slice(0, 50)
      .map((e) => `- ${e.title} (${e.startDate})`)
      .join("\n");

    return `Timeline: ${timeline.title}\nEvents:\n${eventSummaries}`;
  }, [activeTimelineId, timelines, events]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    const context = buildTimelineContext();
    sendMessage(trimmed, context);
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

  const handleEditBeforeAdd = (suggestion: AiGeneratedEvent) => {
    if (!activeTimelineId || tracks.length === 0) return;
    // Create the event and then open detail panel for editing
    addSuggestionAsEvent(suggestion, activeTimelineId, tracks[0].id).then(
      () => {
        // Select the newly created event (last in list) and open detail panel
        const latestEvents = useEventStore.getState().events;
        const created = latestEvents[latestEvents.length - 1];
        if (created) {
          useEventStore.getState().selectEvent(created.id);
          const uiState = useUiStore.getState();
          if (uiState.detailPanelCollapsed) uiState.toggleDetailPanel();
        }
      }
    );
  };

  const handleToggleSelection = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSuggestConnections = async () => {
    if (events.length < 2) {
      useToastStore.getState().addToast({
        type: "info",
        title: "Need at least 2 events to suggest connections",
      });
      return;
    }
    const eventTitles = events.slice(0, 30).map((e) => e.title);
    try {
      useAiStore.setState({ loading: true, error: null });
      const result = await cmd.aiSuggestConnections(eventTitles);
      useAiStore.setState((s) => ({
        messages: [
          ...s.messages,
          { role: "assistant" as const, content: result },
        ],
        loading: false,
      }));
    } catch (e) {
      useAiStore.setState({ error: String(e), loading: false });
    }
  };

  const handleFactCheck = async () => {
    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;
    try {
      useAiStore.setState({ loading: true, error: null });
      const result = await cmd.aiFactCheck(
        event.title,
        event.startDate,
        event.description ?? ""
      );
      useAiStore.setState((s) => ({
        messages: [
          ...s.messages,
          { role: "assistant" as const, content: result },
        ],
        loading: false,
      }));
    } catch (e) {
      useAiStore.setState({ error: String(e), loading: false });
    }
  };

  if (!open) return null;

  const selectedEvent = events.find((e) => e.id === selectedEventId);

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
          <IconButton
            onClick={() => setShowSettings((prev) => !prev)}
            tooltip="AI Settings"
          >
            <Settings size={14} />
          </IconButton>
          <IconButton onClick={clearChat} tooltip="Clear chat">
            <Trash2 size={14} />
          </IconButton>
          <IconButton onClick={onClose} tooltip="Close panel">
            <X size={14} />
          </IconButton>
        </div>
      </div>

      {/* Settings */}
      {showSettings && <AiSettings />}

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
        <div className="border-t border-border p-3 max-h-64 overflow-y-auto">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-2">
            Suggested Events ({suggestions.length})
          </p>
          {activeTimelineId && (
            <AiBatchActions
              suggestions={suggestions}
              timelineId={activeTimelineId}
              selectedIndices={selectedIndices}
            />
          )}
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <AiEventSuggestion
                key={i}
                suggestion={suggestion}
                onAdd={handleAddSuggestion}
                onSkip={handleSkipSuggestion}
                onEditBeforeAdd={handleEditBeforeAdd}
                selected={selectedIndices.has(i)}
                onToggle={() => handleToggleSelection(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSuggestConnections}
          disabled={loading || events.length < 2}
          title="Suggest connections between events"
        >
          <Link2 size={12} className="mr-1" />
          Suggest Connections
        </Button>
        {selectedEvent && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFactCheck}
            disabled={loading}
            title={`Fact check "${selectedEvent.title}"`}
          >
            <ShieldCheck size={12} className="mr-1" />
            Fact Check
          </Button>
        )}
      </div>

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
