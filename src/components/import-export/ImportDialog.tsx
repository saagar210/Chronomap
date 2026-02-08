import { useState, useCallback } from "react";
import { Upload, FileJson, FileText, ArrowRight } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useTimelineStore } from "../../stores/timeline-store";
import * as cmd from "../../lib/commands";
import { invoke } from "@tauri-apps/api/core";

type ImportMode = "select" | "csv-map";

interface ColumnMapping {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  eventType: string;
  importance: string;
}

async function showOpenDialog(
  filterName: string,
  extensions: string[]
): Promise<string | null> {
  return invoke<string | null>("show_open_dialog", {
    filterName,
    filterExtensions: extensions,
  });
}

async function readFileContents(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    eventType: "",
    importance: "",
  });

  const { activeTimelineId, loadTimelines } = useTimelineStore();

  const handleJsonImport = useCallback(async () => {
    try {
      const filePath = await showOpenDialog("JSON", ["json"]);
      if (!filePath) return;

      setLoading(true);
      setError(null);

      const content = await readFileContents(filePath);
      await cmd.importJson(content);
      await loadTimelines();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [loadTimelines, onClose]);

  const handleCsvSelect = useCallback(async () => {
    try {
      const filePath = await showOpenDialog("CSV", ["csv"]);
      if (!filePath) return;

      setLoading(true);
      setError(null);

      const content = await readFileContents(filePath);
      setCsvData(content);

      // Parse header row to get column names
      const firstLine = content.split("\n")[0];
      if (firstLine) {
        const columns = firstLine
          .split(",")
          .map((col: string) => col.trim().replace(/^"|"$/g, ""));
        setCsvColumns(columns);

        // Auto-map columns by name match
        const autoMap: ColumnMapping = {
          title: columns.find((col: string) => /title|name/i.test(col)) ?? "",
          description:
            columns.find((col: string) => /desc/i.test(col)) ?? "",
          startDate:
            columns.find((col: string) => /start|date|begin/i.test(col)) ?? "",
          endDate: columns.find((col: string) => /end/i.test(col)) ?? "",
          eventType: columns.find((col: string) => /type/i.test(col)) ?? "",
          importance:
            columns.find((col: string) => /importance|priority/i.test(col)) ??
            "",
        };
        setColumnMapping(autoMap);
      }

      setMode("csv-map");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCsvImport = useCallback(async () => {
    if (!csvData || !activeTimelineId) return;

    setLoading(true);
    setError(null);

    try {
      const mapping: Record<string, string> = {};
      for (const [key, value] of Object.entries(columnMapping)) {
        if (value) mapping[key] = value;
      }

      const count = await cmd.importCsv(activeTimelineId, csvData, mapping);
      console.info(`Imported ${count} events`);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [csvData, activeTimelineId, columnMapping, onClose]);

  const handleClose = () => {
    setMode("select");
    setError(null);
    setCsvData(null);
    setCsvColumns([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Timeline Data">
      {loading && <LoadingSpinner />}

      {error && (
        <div className="mb-3 p-2 rounded bg-danger/10 border border-danger/20">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {mode === "select" && !loading && (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary mb-4">
            Choose a format to import timeline data.
          </p>

          <button
            onClick={handleJsonImport}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <FileJson size={20} className="text-accent shrink-0" />
            <div className="text-left flex-1">
              <p className="text-xs font-medium text-text">JSON Import</p>
              <p className="text-[10px] text-text-muted">
                Import a full timeline from a JSON export
              </p>
            </div>
            <ArrowRight size={14} className="text-text-muted" />
          </button>

          <button
            onClick={handleCsvSelect}
            disabled={!activeTimelineId}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={20} className="text-accent shrink-0" />
            <div className="text-left flex-1">
              <p className="text-xs font-medium text-text">CSV Import</p>
              <p className="text-[10px] text-text-muted">
                Import events from a CSV file into the current timeline
              </p>
            </div>
            <ArrowRight size={14} className="text-text-muted" />
          </button>

          {!activeTimelineId && (
            <p className="text-[10px] text-text-muted text-center">
              Select a timeline first to use CSV import
            </p>
          )}
        </div>
      )}

      {mode === "csv-map" && !loading && (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary mb-2">
            Map your CSV columns to event fields.
          </p>

          {(Object.keys(columnMapping) as Array<keyof ColumnMapping>).map(
            (field) => (
              <div key={field} className="flex items-center gap-2">
                <label className="text-xs text-text-secondary w-24 capitalize">
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <select
                  value={columnMapping[field]}
                  onChange={(e) =>
                    setColumnMapping((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="">-- Skip --</option>
                  {csvColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("select")}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCsvImport}
              disabled={!columnMapping.title || !columnMapping.startDate}
            >
              <Upload size={12} className="mr-1" />
              Import
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
