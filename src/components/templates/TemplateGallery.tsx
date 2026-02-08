import { useState, useEffect, useCallback } from "react";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { Button } from "../common/Button";
import { IconButton } from "../common/IconButton";
import { Input } from "../common/Input";
import { Modal } from "../common/Modal";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EmptyState } from "../common/EmptyState";
import { useTimelineStore } from "../../stores/timeline-store";
import type { Template } from "../../lib/types";
import * as cmd from "../../lib/commands";

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
}

export function TemplateGallery({ open, onClose }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const { loadTimelines, setActiveTimeline } = useTimelineStore();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await cmd.listTemplates();
      setTemplates(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setNewTitle("");
      setSelectedTemplateId(null);
    }
  }, [open, fetchTemplates]);

  const handleCreate = async () => {
    if (!selectedTemplateId || !newTitle.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const timelineId = await cmd.createFromTemplate(
        selectedTemplateId,
        newTitle.trim()
      );
      await loadTimelines();
      setActiveTimeline(timelineId);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await cmd.deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Timeline Templates">
      {loading && <LoadingSpinner />}

      {error && (
        <div className="mb-3 p-2 rounded bg-danger/10 border border-danger/20">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {!loading && templates.length === 0 && (
        <EmptyState
          icon={<LayoutTemplate size={24} />}
          title="No Templates"
          description="Save a timeline as a template to reuse its structure."
        />
      )}

      {!loading && templates.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`relative p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedTemplateId === template.id
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-bg-tertiary"
                }`}
              >
                <div className="flex items-start justify-between">
                  <LayoutTemplate
                    size={16}
                    className={
                      selectedTemplateId === template.id
                        ? "text-accent"
                        : "text-text-muted"
                    }
                  />
                  {!template.isBuiltin && (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                      tooltip="Delete template"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  )}
                </div>
                <p className="text-xs font-medium text-text mt-2">
                  {template.name}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">
                  {template.description}
                </p>
                {template.isBuiltin && (
                  <span className="inline-block mt-1.5 text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                    Built-in
                  </span>
                )}
              </button>
            ))}
          </div>

          {selectedTemplateId && (
            <div className="border-t border-border pt-3">
              <Input
                label="Timeline Title"
                placeholder="My new timeline"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="flex justify-end mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || loading}
                >
                  <Plus size={12} className="mr-1" />
                  Create from Template
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
