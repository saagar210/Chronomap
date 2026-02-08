import { create } from "zustand";
import * as cmd from "../lib/commands";

type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  loadTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",

  loadTheme: async () => {
    try {
      const setting = await cmd.getSetting("theme");
      const value = setting.value;
      const theme: Theme = value === "light" || value === "dark" || value === "system"
        ? value
        : "system";
      set({ theme });
      applyTheme(theme);
    } catch {
      applyTheme("system");
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    applyTheme(theme);
    try {
      await cmd.updateSetting("theme", theme);
    } catch {
      // Theme applied locally even if save fails
    }
  },
}));
