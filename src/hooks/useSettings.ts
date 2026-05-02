import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import i18n from "../i18n";
import { useSettingsStore } from "../store/settingsStore";
import type { AppSettings } from "../types";

const accentMap: Record<string, [string, string]> = {
  coral: ["61 91 197", "47 75 178"],
  indigo: ["61 91 197", "47 75 178"],
  violet: ["88 94 205", "72 78 187"],
  emerald: ["61 91 197", "47 75 178"],
  rose: ["61 91 197", "47 75 178"],
  amber: ["61 91 197", "47 75 178"],
  sky: ["61 91 197", "47 75 178"],
};

function normalizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    theme: settings.theme === "dark" ? "light" : settings.theme,
    accentColor: settings.accentColor || "indigo",
  };
}

export function applySettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings);
  const root = document.documentElement;
  root.dataset.theme = "light";
  root.dataset.fontSize = normalized.fontSize;
  root.dataset.compact = String(normalized.compactMode);
  const [accent, hover] = accentMap[normalized.accentColor] ?? accentMap.indigo;
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-hover", hover);
  i18n.changeLanguage(normalized.language);
}

export function useSettings() {
  const store = useSettingsStore();
  useEffect(() => {
    store.setLoading(true);
    invoke<AppSettings>("get_settings")
      .then((settings) => {
        const normalized = normalizeSettings(settings);
        store.setSettings(normalized);
        applySettings(normalized);
        if (settings.theme === "dark") {
          void invoke("save_settings", { settings: normalized });
        }
      })
      .catch((err) => store.setError(String(err)))
      .finally(() => store.setLoading(false));
  }, []);
  const save = async (settings: AppSettings) => {
    const normalized = normalizeSettings(settings);
    store.setSettings(normalized);
    applySettings(normalized);
    await invoke("save_settings", { settings: normalized });
  };
  return { ...store, save };
}
