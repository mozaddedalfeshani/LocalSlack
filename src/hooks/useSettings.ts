import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import i18n from "../i18n";
import { useSettingsStore } from "../store/settingsStore";
import type { AppSettings } from "../types";

const accentMap: Record<string, [string, string]> = {
  indigo: ["#6366f1", "#4f46e5"],
  violet: ["#8b5cf6", "#7c3aed"],
  emerald: ["#10b981", "#059669"],
  rose: ["#f43f5e", "#e11d48"],
  amber: ["#f59e0b", "#d97706"],
  sky: ["#0ea5e9", "#0284c7"]
};

export function applySettings(settings: AppSettings) {
  const root = document.documentElement;
  const theme = settings.theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : settings.theme;
  root.dataset.theme = theme;
  root.dataset.fontSize = settings.fontSize;
  root.dataset.compact = String(settings.compactMode);
  const [accent, hover] = accentMap[settings.accentColor] ?? accentMap.indigo;
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-hover", hover);
  i18n.changeLanguage(settings.language);
}

export function useSettings() {
  const store = useSettingsStore();
  useEffect(() => {
    store.setLoading(true);
    invoke<AppSettings>("get_settings")
      .then((settings) => {
        store.setSettings(settings);
        applySettings(settings);
      })
      .catch((err) => store.setError(String(err)))
      .finally(() => store.setLoading(false));
  }, []);
  const save = async (settings: AppSettings) => {
    store.setSettings(settings);
    applySettings(settings);
    await invoke("save_settings", { settings });
  };
  return { ...store, save };
}
