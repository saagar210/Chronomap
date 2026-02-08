import { useState } from "react";
import { TRACK_COLORS } from "../../lib/constants";
import { Check } from "lucide-react";

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
  label?: string;
}

const EXTRA_COLORS = ["#64748b", "#a3a3a3", "#000000", "#ffffff"];
const SWATCHES = [...TRACK_COLORS, ...EXTRA_COLORS];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(value ?? "");

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="w-6 h-6 rounded-full border border-border flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
          >
            {value === color && (
              <Check size={12} className={isLight(color) ? "text-black" : "text-white"} />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-text-secondary">Custom:</span>
        <input
          type="text"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          onBlur={() => {
            if (/^#[0-9a-fA-F]{3,6}$/.test(customHex)) {
              onChange(customHex);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && /^#[0-9a-fA-F]{3,6}$/.test(customHex)) {
              onChange(customHex);
            }
          }}
          placeholder="#3b82f6"
          className="w-20 rounded border border-border bg-bg px-2 py-0.5 text-xs text-text"
        />
        {value && (
          <div
            className="w-5 h-5 rounded border border-border"
            style={{ backgroundColor: value }}
          />
        )}
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
