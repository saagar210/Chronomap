import { useState } from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAiStore } from "../../stores/ai-store";

export function OllamaStatus() {
  const [expanded, setExpanded] = useState(false);
  const { connected, models, checkConnection, loading } = useAiStore();

  const handleClick = () => {
    if (!connected) {
      checkConnection();
    }
    setExpanded((prev) => !prev);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-bg-tertiary transition-colors text-xs cursor-pointer"
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            connected ? "bg-green-500" : "bg-red-500"
          )}
        />
        <Cpu size={12} className="text-text-secondary" />
        <span className="text-text-secondary">
          {connected ? "Ollama" : "Disconnected"}
        </span>
        <ChevronDown
          size={10}
          className={cn(
            "text-text-muted transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-bg border border-border rounded-md shadow-lg min-w-[180px]">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              {connected ? "Available Models" : "Status"}
            </p>
          </div>
          <div className="p-2">
            {loading && (
              <p className="text-xs text-text-muted px-1">Checking...</p>
            )}
            {!loading && !connected && (
              <div className="text-xs text-text-secondary px-1">
                <p className="mb-1">Ollama not detected</p>
                <p className="text-[10px] text-text-muted">
                  Make sure Ollama is running on localhost:11434
                </p>
              </div>
            )}
            {!loading && connected && models.length === 0 && (
              <p className="text-xs text-text-muted px-1">No models found</p>
            )}
            {!loading &&
              connected &&
              models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center gap-2 px-1 py-1 text-xs text-text"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {model.name}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
