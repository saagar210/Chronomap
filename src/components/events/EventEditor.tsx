import { useCallback, useEffect, useState } from "react";
import { Trash2, Sparkles, ExternalLink as LinkIcon } from "lucide-react";
import { useEventStore } from "../../stores/event-store";
import { useTrackStore } from "../../stores/track-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { TagInput } from "../common/TagInput";
import { ColorPicker } from "../common/ColorPicker";
import { formatDate } from "../../lib/utils";
import type { UpdateEventInput } from "../../lib/types";

interface EventEditorProps {
  eventId: string;
}

export function EventEditor({ eventId }: EventEditorProps) {
  const { events, updateEvent, deleteEvent, selectEvent } = useEventStore();
  const { tracks } = useTrackStore();
  const event = events.find((e) => e.id === eventId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [trackId, setTrackId] = useState("");
  const [eventType, setEventType] = useState("point");
  const [importance, setImportance] = useState(3);
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [externalLink, setExternalLink] = useState("");
  const [source, setSource] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setStartDate(event.startDate);
      setEndDate(event.endDate ?? "");
      setTrackId(event.trackId);
      setEventType(event.eventType);
      setImportance(event.importance);
      setColor(event.color);
      setIcon(event.icon ?? "");
      setTags(event.tags ? event.tags.split(",").filter(Boolean) : []);
      setExternalLink(event.externalLink ?? "");
      setSource(event.source ?? "");
    }
  }, [event]);

  const saveField = useCallback(
    (field: Partial<UpdateEventInput>) => {
      updateEvent({ id: eventId, ...field });
      useCanvasStore.getState().markDirty();
    },
    [eventId, updateEvent]
  );

  if (!event) return null;

  return (
    <div className="p-3 flex flex-col gap-3 overflow-y-auto">
      {event.aiGenerated && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
          <Sparkles size={14} className="text-purple-400" />
          <span className="text-xs text-purple-400">
            AI Generated
            {event.aiConfidence !== null && ` (${Math.round(event.aiConfidence * 100)}% confidence)`}
          </span>
        </div>
      )}

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title !== event.title) saveField({ title });
        }}
      />

      <Input
        label="Start Date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        onBlur={() => {
          if (startDate !== event.startDate) saveField({ startDate });
        }}
        placeholder="YYYY-MM-DD"
      />

      <Input
        label="End Date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        onBlur={() => {
          const val = endDate || undefined;
          if (endDate !== (event.endDate ?? ""))
            saveField({ endDate: val } as Partial<UpdateEventInput>);
        }}
        placeholder="YYYY-MM-DD (optional)"
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Track</label>
        <select
          value={trackId}
          onChange={(e) => {
            setTrackId(e.target.value);
            saveField({ trackId: e.target.value });
          }}
          className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm"
        >
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Type</label>
        <select
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            saveField({ eventType: e.target.value } as Partial<UpdateEventInput>);
          }}
          className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm"
        >
          <option value="point">Point</option>
          <option value="range">Range</option>
          <option value="milestone">Milestone</option>
          <option value="era">Era</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">
          Importance ({importance})
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={importance}
          onChange={(e) => {
            const val = Number(e.target.value);
            setImportance(val);
            saveField({ importance: val } as Partial<UpdateEventInput>);
          }}
          className="w-full"
        />
      </div>

      <ColorPicker
        label="Color"
        value={color}
        onChange={(c) => {
          setColor(c);
          saveField({ color: c });
        }}
      />

      <Input
        label="Icon / Emoji"
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        onBlur={() => {
          if (icon !== (event.icon ?? "")) saveField({ icon: icon || undefined });
        }}
        placeholder="e.g., ⭐ or icon name"
      />

      <TagInput
        label="Tags"
        tags={tags}
        onChange={(newTags) => {
          setTags(newTags);
          saveField({ tags: newTags.join(",") });
        }}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">Description</label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-accent cursor-pointer hover:underline"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm min-h-[80px] prose prose-sm max-w-none text-text"
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(description) }}
          />
        ) : (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== event.description) saveField({ description });
            }}
            rows={4}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm resize-y"
            placeholder="Event description (supports **bold** and *italic*)..."
          />
        )}
      </div>

      <Input
        label="External Link"
        value={externalLink}
        onChange={(e) => setExternalLink(e.target.value)}
        onBlur={() => {
          if (externalLink !== (event.externalLink ?? ""))
            saveField({ externalLink: externalLink || undefined });
        }}
        placeholder="https://..."
      />
      {externalLink && (
        <a
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent flex items-center gap-1 hover:underline"
        >
          <LinkIcon size={12} /> Open link
        </a>
      )}

      <Input
        label="Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        onBlur={() => {
          if (source !== (event.source ?? ""))
            saveField({ source: source || undefined });
        }}
        placeholder="Source attribution"
      />

      <div className="text-xs text-text-muted">
        Created: {formatDate(event.createdAt)}
      </div>

      <div className="border-t border-border pt-3 mt-1">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm("Delete this event?")) {
              deleteEvent(eventId);
              selectEvent(null);
            }
          }}
        >
          <Trash2 size={12} className="inline mr-1" />
          Delete Event
        </Button>
      </div>
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}
