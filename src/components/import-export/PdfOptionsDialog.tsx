import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { useTimelineStore } from "../../stores/timeline-store";
import { useToastStore } from "../../stores/toast-store";
import * as cmd from "../../lib/commands";

interface PdfOptionsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PdfOptionsDialog({ open, onClose }: PdfOptionsDialogProps) {
  const [exporting, setExporting] = useState(false);
  const activeTimelineId = useTimelineStore((s) => s.activeTimelineId);
  const addToast = useToastStore((s) => s.addToast);

  const handleExport = async () => {
    if (!activeTimelineId) return;

    setExporting(true);
    try {
      const bytes = await cmd.exportPdf(activeTimelineId);
      const uint8Array = new Uint8Array(bytes);
      const blob = new Blob([uint8Array], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = `timeline-${Date.now()}.pdf`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        type: "success",
        title: "PDF exported",
        description: "Timeline exported as PDF.",
      });
      onClose();
    } catch (e) {
      addToast({
        type: "error",
        title: "PDF export failed",
        description: String(e),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Export as PDF">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-tertiary">
          <FileText size={20} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text">
              Export your timeline as a PDF document. The layout and formatting
              are handled automatically.
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              Includes all events, tracks, and connections in a printable format.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={exporting || !activeTimelineId}
          >
            <Download size={12} className="mr-1" />
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
