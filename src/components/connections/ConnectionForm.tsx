import { useState } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { ColorPicker } from "../common/ColorPicker";
import type { ConnectionType } from "../../lib/types";

interface ConnectionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { label: string; connectionType: ConnectionType; color: string | null }) => void;
  initialLabel?: string;
  initialType?: ConnectionType;
  initialColor?: string | null;
  title?: string;
}

const CONNECTION_TYPES: { value: ConnectionType; label: string }[] = [
  { value: "related", label: "Related" },
  { value: "caused", label: "Caused" },
  { value: "preceded", label: "Preceded" },
  { value: "influenced", label: "Influenced" },
];

export function ConnectionForm({
  open,
  onClose,
  onSubmit,
  initialLabel = "",
  initialType = "related",
  initialColor = null,
  title = "Create Connection",
}: ConnectionFormProps) {
  const [label, setLabel] = useState(initialLabel);
  const [connectionType, setConnectionType] = useState<ConnectionType>(initialType);
  const [color, setColor] = useState<string | null>(initialColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ label, connectionType, color });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Led to..."
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">Connection Type</label>
          <select
            value={connectionType}
            onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm"
          >
            {CONNECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <ColorPicker
          label="Color (optional)"
          value={color}
          onChange={setColor}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {title === "Create Connection" ? "Create" : "Update"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
