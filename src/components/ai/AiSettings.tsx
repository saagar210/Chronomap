import { useState, useEffect } from "react";
import { Wifi, WifiOff, Save } from "lucide-react";
import { Button } from "../common/Button";
import { useAiStore } from "../../stores/ai-store";
import { useToastStore } from "../../stores/toast-store";
import * as cmd from "../../lib/commands";

export function AiSettings() {
  const [host, setHost] = useState("http://localhost:11434");
  const [loadingHost, setLoadingHost] = useState(true);
  const { connected, models, checkConnection, loading } = useAiStore();

  useEffect(() => {
    cmd
      .getSetting("ollama_host")
      .then((setting) => {
        if (setting?.value) setHost(setting.value);
      })
      .catch(() => {
        // Setting may not exist yet, use default
      })
      .finally(() => setLoadingHost(false));
  }, []);

  const handleTestConnection = async () => {
    await checkConnection();
    const state = useAiStore.getState();
    if (state.connected) {
      useToastStore.getState().addToast({
        type: "success",
        title: "Connected to Ollama",
        description: `${state.models.length} model(s) available`,
      });
    } else {
      useToastStore.getState().addToast({
        type: "error",
        title: "Connection failed",
        description: "Could not reach Ollama. Is it running?",
      });
    }
  };

  const handleSave = async () => {
    try {
      await cmd.updateSetting("ollama_host", host);
      useToastStore.getState().addToast({
        type: "success",
        title: "Settings saved",
      });
    } catch (e) {
      useToastStore.getState().addToast({
        type: "error",
        title: "Failed to save settings",
        description: String(e),
      });
    }
  };

  if (loadingHost) return null;

  return (
    <div className="border-b border-border p-3 space-y-3">
      <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
        AI Settings
      </p>

      {/* Ollama Host */}
      <div>
        <label className="text-[10px] text-text-secondary block mb-1">
          Ollama Host
        </label>
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="http://localhost:11434"
          className="w-full bg-bg-tertiary rounded-md px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>

      {/* Model Dropdown */}
      <div>
        <label className="text-[10px] text-text-secondary block mb-1">
          Available Models
        </label>
        {connected && models.length > 0 ? (
          <select className="w-full bg-bg-tertiary border border-border rounded-md px-2 py-1.5 text-xs text-text cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/50">
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[10px] text-text-muted">
            {connected ? "No models found" : "Connect to see models"}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleTestConnection}
          disabled={loading}
        >
          {connected ? (
            <Wifi size={12} className="mr-1" />
          ) : (
            <WifiOff size={12} className="mr-1" />
          )}
          Test
        </Button>
        <Button size="sm" variant="primary" onClick={handleSave}>
          <Save size={12} className="mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}
