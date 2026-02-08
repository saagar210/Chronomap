import { useState } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { TRACK_COLORS } from "../../lib/constants";
import { cn } from "../../lib/utils";

interface TrackFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  initialName?: string;
  initialColor?: string;
  title?: string;
}

export function TrackForm({
  open,
  onClose,
  onSubmit,
  initialName = "",
  initialColor = TRACK_COLORS[0],
  title = "New Track",
}: TrackFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), color);
    setName("");
    setColor(TRACK_COLORS[0]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Track name"
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {TRACK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 cursor-pointer transition-transform",
                  color === c ? "border-text scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            {initialName ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
