import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTimelineStore } from "../../stores/timeline-store";
import { useToastStore } from "../../stores/toast-store";
import * as cmd from "../../lib/commands";
import { Clock, FileText, Download, Layers } from "lucide-react";
import type { Template } from "../../lib/types";

export function WelcomeScreen() {
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreateBlank = useCallback(async () => {
    try {
      await useTimelineStore.getState().createTimeline({
        title: "New Timeline",
      });
    } catch {
      // Toast handled by store
    }
  }, []);

  const handleShowTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await cmd.listTemplates();
      setTemplates(list);
      setShowTemplates(true);
    } catch (e) {
      useToastStore.getState().addToast({
        type: "error",
        title: "Failed to load templates",
        description: String(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateFromTemplate = useCallback(async (templateId: string, templateName: string) => {
    try {
      const timelineId = await cmd.createFromTemplate(templateId, `${templateName} Timeline`);
      await useTimelineStore.getState().loadTimelines();
      useTimelineStore.getState().setActiveTimeline(timelineId);
      useToastStore.getState().addToast({
        type: "success",
        title: `Created timeline from "${templateName}"`,
      });
    } catch (e) {
      useToastStore.getState().addToast({
        type: "error",
        title: "Failed to create from template",
        description: String(e),
      });
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const filePath = await invoke<string | null>("show_open_dialog", {
        filterName: "JSON",
        filterExtensions: ["json"],
      });
      if (!filePath) return;

      const content = await invoke<string>("read_file", { path: filePath });
      await cmd.importJson(content);
      await useTimelineStore.getState().loadTimelines();
      useToastStore.getState().addToast({
        type: "success",
        title: "Timeline imported successfully",
      });
    } catch (e) {
      useToastStore.getState().addToast({
        type: "error",
        title: "Import failed",
        description: String(e),
      });
    }
  }, []);

  if (showTemplates) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg">
        <Layers size={36} className="text-accent mb-3" />
        <h2 className="text-lg font-semibold text-text mb-1">Choose a Template</h2>
        <p className="text-xs text-text-muted mb-4">
          Start with a pre-built timeline structure
        </p>
        <div className="w-full space-y-2 mb-4">
          {templates.length === 0 ? (
            <p className="text-sm text-text-muted py-4">No templates available yet.</p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleCreateFromTemplate(t.id, t.name)}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-accent hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium text-text">{t.name}</div>
                {t.description && (
                  <div className="text-xs text-text-muted mt-0.5">{t.description}</div>
                )}
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => setShowTemplates(false)}
          className="text-xs text-text-secondary hover:text-text cursor-pointer"
        >
          Back to Welcome
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Clock size={48} className="text-accent mb-4" />
      <h2 className="text-lg font-semibold text-text mb-1">Welcome to ChronoMap</h2>
      <p className="text-sm text-text-muted mb-6 max-w-sm">
        Create interactive, zoomable timelines with AI-powered research
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg w-full">
        <button
          onClick={handleCreateBlank}
          className="flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-border hover:border-accent hover:bg-bg-secondary transition-colors cursor-pointer group"
        >
          <FileText size={24} className="text-text-muted group-hover:text-accent transition-colors" />
          <span className="text-sm font-medium text-text">Create Blank</span>
          <span className="text-xs text-text-muted">Start from scratch</span>
        </button>
        <button
          onClick={handleShowTemplates}
          disabled={loading}
          className="flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-border hover:border-accent hover:bg-bg-secondary transition-colors cursor-pointer group disabled:opacity-50"
        >
          <Layers size={24} className="text-text-muted group-hover:text-accent transition-colors" />
          <span className="text-sm font-medium text-text">Use Template</span>
          <span className="text-xs text-text-muted">Pre-built structures</span>
        </button>
        <button
          onClick={handleImport}
          className="flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-border hover:border-accent hover:bg-bg-secondary transition-colors cursor-pointer group"
        >
          <Download size={24} className="text-text-muted group-hover:text-accent transition-colors" />
          <span className="text-sm font-medium text-text">Import Data</span>
          <span className="text-xs text-text-muted">Load JSON file</span>
        </button>
      </div>
    </div>
  );
}
