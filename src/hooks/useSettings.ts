import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import i18n from "../i18n";
import { useSettingsStore } from "../store/settingsStore";
import type { AppSettings } from "../types";

const accentMap: Record<string, [string, string]> = {
  coral: ["255 122 144", "255 96 123"],
  indigo: ["99 102 241", "79 70 229"],
  violet: ["139 92 246", "124 58 237"],
  emerald: ["16 185 129", "5 150 105"],
  rose: ["244 63 94", "225 29 72"],
  amber: ["245 158 11", "217 119 6"],
  sky: ["14 165 233", "2 132 199"]
};

export function applySettings(settings: AppSettings) {
  const root = document.documentElement;
  const theme = settings.theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : settings.theme;
  root.dataset.theme = theme;
  root.dataset.fontSize = settings.fontSize;
  root.dataset.compact = String(settings.compactMode);
  const [accent, hover] = accentMap[settings.accentColor] ?? accentMap.coral;
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
