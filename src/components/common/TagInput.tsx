import { useState, useCallback } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function TagInput({ tags, onChange, label, placeholder = "Add tag..." }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInput("");
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <div className="flex flex-wrap gap-1 p-1.5 rounded-md border border-border bg-bg min-h-[34px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-danger cursor-pointer"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[60px] bg-transparent text-sm outline-none text-text"
        />
      </div>
    </div>
  );
}
