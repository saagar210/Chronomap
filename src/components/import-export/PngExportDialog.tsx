import { useState } from "react";
import { Download, Image } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { useToastStore } from "../../stores/toast-store";

type Resolution = 1 | 2 | 3;

interface PngExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PngExportDialog({ open, onClose }: PngExportDialogProps) {
  const [resolution, setResolution] = useState<Resolution>(2);
  const [exporting, setExporting] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleExport = () => {
    setExporting(true);

    try {
      const sourceCanvas = document.querySelector("canvas");
      if (!sourceCanvas) {
        addToast({
          type: "error",
          title: "No canvas found",
          description: "There is no timeline canvas to export.",
        });
        return;
      }

      const scale = resolution;
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = sourceCanvas.width * scale;
      scaledCanvas.height = sourceCanvas.height * scale;

      const ctx = scaledCanvas.getContext("2d");
      if (!ctx) {
        addToast({
          type: "error",
          title: "Export failed",
          description: "Could not create canvas context.",
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        sourceCanvas,
        0,
        0,
        scaledCanvas.width,
        scaledCanvas.height
      );

      const dataUrl = scaledCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `timeline-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        type: "success",
        title: "PNG exported",
        description: `Exported at ${scale}x resolution.`,
      });
      onClose();
    } catch (e) {
      addToast({
        type: "error",
        title: "Export failed",
        description: String(e),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Export as PNG">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-secondary mb-3">
            Choose the export resolution. Higher resolution produces larger,
            sharper images.
          </p>

          <div className="flex gap-3">
            {([1, 2, 3] as const).map((scale) => (
              <label
                key={scale}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                  resolution === scale
                    ? "border-accent bg-accent/10"
                    : "border-border hover:bg-bg-tertiary"
                }`}
              >
                <input
                  type="radio"
                  name="resolution"
                  value={scale}
                  checked={resolution === scale}
                  onChange={() => setResolution(scale)}
                  className="sr-only"
                />
                <Image
                  size={20}
                  className={
                    resolution === scale ? "text-accent" : "text-text-muted"
                  }
                />
                <span className="text-xs font-medium">{scale}x</span>
                <span className="text-[10px] text-text-muted">
                  {scale === 1 && "Standard"}
                  {scale === 2 && "Retina"}
                  {scale === 3 && "Ultra"}
                </span>
              </label>
            ))}
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
            disabled={exporting}
          >
            <Download size={12} className="mr-1" />
            {exporting ? "Exporting..." : "Export PNG"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
