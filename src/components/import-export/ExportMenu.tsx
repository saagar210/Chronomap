import { useState } from "react";
import { Download, ChevronDown, FileJson, FileText, FileType } from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/utils";
import { useTimelineStore } from "../../stores/timeline-store";
import * as cmd from "../../lib/commands";
import { invoke } from "@tauri-apps/api/core";

async function showSaveDialog(
  defaultName: string,
  filterLabel: string,
  extension: string
): Promise<string | null> {
  const result = await invoke<string | null>("show_save_dialog", {
    defaultPath: defaultName,
    filterName: filterLabel,
    filterExtensions: [extension],
  });
  return result;
}

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const activeTimelineId = useTimelineStore((s) => s.activeTimelineId);

  const handleExport = async (format: "json" | "csv" | "markdown") => {
    if (!activeTimelineId) return;
    setExporting(true);
    setOpen(false);

    try {
      let content: string;
      let defaultName: string;
      let filterLabel: string;
      let extension: string;

      switch (format) {
        case "json":
          content = await cmd.exportJson(activeTimelineId);
          defaultName = "timeline.json";
          filterLabel = "JSON";
          extension = "json";
          break;
        case "csv":
          content = await cmd.exportCsv(activeTimelineId);
          defaultName = "timeline.csv";
          filterLabel = "CSV";
          extension = "csv";
          break;
        case "markdown":
          content = await cmd.exportMarkdown(activeTimelineId);
          defaultName = "timeline.md";
          filterLabel = "Markdown";
          extension = "md";
          break;
      }

      const filePath = await showSaveDialog(defaultName, filterLabel, extension);

      if (filePath) {
        await cmd.saveFile(filePath, content);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        disabled={!activeTimelineId || exporting}
      >
        <Download size={14} className="mr-1" />
        Export
        <ChevronDown
          size={10}
          className={cn("ml-1 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-bg border border-border rounded-md shadow-lg min-w-[160px]">
          <button
            onClick={() => handleExport("json")}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <FileJson size={14} className="text-text-secondary" />
            Export as JSON
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <FileText size={14} className="text-text-secondary" />
            Export as CSV
          </button>
          <button
            onClick={() => handleExport("markdown")}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text hover:bg-bg-tertiary transition-colors border-t border-border cursor-pointer"
          >
            <FileType size={14} className="text-text-secondary" />
            Export as Markdown
          </button>
        </div>
      )}
    </div>
  );
}
