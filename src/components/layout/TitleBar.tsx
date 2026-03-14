import { useState } from "react";
import {
  Plus,
  Sun,
  Moon,
  Monitor,
  Maximize2,
  Upload,
  Bot,
  LayoutTemplate,
  Undo2,
  Redo2,
} from "lucide-react";
import { useTimelineStore } from "../../stores/timeline-store";
import { useThemeStore } from "../../stores/theme-store";
import { useCanvasStore } from "../../stores/canvas-store";
import { useEventStore } from "../../stores/event-store";
import { useHistoryStore } from "../../stores/history-store";
import { useToastStore } from "../../stores/toast-store";
import { useUiStore } from "../../stores/ui-store";
import { fitAllEvents } from "../../lib/canvas-math";
import { IconButton } from "../common/IconButton";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { SearchBar } from "../search/SearchBar";
import { ExportMenu } from "../import-export/ExportMenu";
import { ImportDialog } from "../import-export/ImportDialog";
import { TemplateGallery } from "../templates/TemplateGallery";
import { OllamaStatus } from "../ai/OllamaStatus";

interface TitleBarProps {
  onToggleAi?: () => void;
}

export function TitleBar({ onToggleAi }: TitleBarProps) {
  const { timelines, activeTimelineId, setActiveTimeline } = useTimelineStore();
  const { createTimeline } = useTimelineStore();
  const { theme, setTheme } = useThemeStore();
  const openModal = useUiStore((s) => s.openModal);
  const undoStack = useHistoryStore((s) => s.undoStack);
  const redoStack = useHistoryStore((s) => s.redoStack);

  const handleUndo = async () => {
    const history = useHistoryStore.getState();
    if (!history.canUndo()) return;
    await history.undo();
    if (activeTimelineId) {
      await useEventStore.getState().loadEvents(activeTimelineId);
    }
    useCanvasStore.getState().markDirty();
    useToastStore.getState().addToast({ type: "info", title: "Undone" });
  };

  const handleRedo = async () => {
    const history = useHistoryStore.getState();
    if (!history.canRedo()) return;
    await history.redo();
    if (activeTimelineId) {
      await useEventStore.getState().loadEvents(activeTimelineId);
    }
    useCanvasStore.getState().markDirty();
    useToastStore.getState().addToast({ type: "info", title: "Redone" });
  };
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTimeline({ title: newTitle.trim() });
    setNewTitle("");
    setShowNewDialog(false);
  };

  const handleFitAll = () => {
    const events = useEventStore.getState().events;
    const { viewportWidth } = useCanvasStore.getState();
    if (viewportWidth > 0) {
      const { zoom, panOffsetX } = fitAllEvents(events, viewportWidth);
      useCanvasStore.getState().setZoom(zoom);
      useCanvasStore.getState().setPan(panOffsetX, 0);
    }
  };

  const cycleTheme = () => {
    const next: Record<string, "light" | "dark" | "system"> = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    setTheme(next[theme]);
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <>
      <header className="h-11 border-b border-border bg-bg-secondary flex items-center px-3 gap-2 flex-shrink-0">
        <select
          value={activeTimelineId ?? ""}
          onChange={(e) => setActiveTimeline(e.target.value || null)}
          className="text-sm bg-transparent border border-border rounded-md px-2 py-1 text-text min-w-[160px] cursor-pointer"
        >
          <option value="">Select timeline...</option>
          {timelines.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <IconButton
          tooltip="New timeline"
          onClick={() => setShowNewDialog(true)}
        >
          <Plus size={16} />
        </IconButton>

        <IconButton
          tooltip="From template"
          onClick={() => setShowTemplates(true)}
        >
          <LayoutTemplate size={16} />
        </IconButton>

        {activeTimelineId && (
          <>
            <div className="w-px h-5 bg-border" />
            <IconButton
              tooltip="Add event"
              onClick={() => openModal("create-event")}
            >
              <Plus size={16} />
            </IconButton>
            <IconButton tooltip="Fit all events" onClick={handleFitAll}>
              <Maximize2 size={16} />
            </IconButton>
          </>
        )}

        <div className="w-px h-5 bg-border" />
        <IconButton
          tooltip="Undo (⌘Z)"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
        >
          <Undo2 size={16} />
        </IconButton>
        <IconButton
          tooltip="Redo (⌘⇧Z)"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
        >
          <Redo2 size={16} />
        </IconButton>

        <div className="w-px h-5 bg-border" />
        <div className="w-48">
          <SearchBar />
        </div>

        <div className="flex-1" />

        {activeTimelineId && (
          <>
            <IconButton tooltip="Import" onClick={() => setShowImport(true)}>
              <Upload size={16} />
            </IconButton>
            <ExportMenu />
          </>
        )}

        <div className="w-px h-5 bg-border" />
        <OllamaStatus />

        <IconButton tooltip="AI Assistant" onClick={onToggleAi}>
          <Bot size={16} />
        </IconButton>

        <IconButton tooltip={`Theme: ${theme}`} onClick={cycleTheme}>
          <ThemeIcon size={16} />
        </IconButton>
      </header>

      <Modal
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        title="New Timeline"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="My Timeline"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowNewDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!newTitle.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
      <TemplateGallery
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
      />
    </>
  );
}
