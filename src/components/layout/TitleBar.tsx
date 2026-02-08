import { useState } from "react";
import { Plus, Sun, Moon, Monitor } from "lucide-react";
import { useTimelineStore } from "../../stores/timeline-store";
import { useThemeStore } from "../../stores/theme-store";
import { IconButton } from "../common/IconButton";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";

export function TitleBar() {
  const { timelines, activeTimelineId, setActiveTimeline } = useTimelineStore();
  const { createTimeline } = useTimelineStore();
  const { theme, setTheme } = useThemeStore();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const activeTimeline = timelines.find((t) => t.id === activeTimelineId);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createTimeline({ title: newTitle.trim() });
    setNewTitle("");
    setShowNewDialog(false);
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

        <IconButton tooltip="New timeline" onClick={() => setShowNewDialog(true)}>
          <Plus size={16} />
        </IconButton>

        <div className="flex-1" />

        {activeTimeline && (
          <span className="text-xs text-text-muted hidden sm:block">
            {activeTimeline.title}
          </span>
        )}

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
            <Button variant="ghost" type="button" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!newTitle.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
