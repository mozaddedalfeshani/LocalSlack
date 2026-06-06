import { create } from "zustand";
import type { AppSettings } from "../types";

export const defaultSettings: AppSettings = {
  deviceName: "LocalSlack Device",
  deviceEmoji: "🚀",
  deviceId: "",
  savePath: "",
  quickSave: false,
  quickSaveMode: "off",
  autoOpen: false,
  language: "en",
  port: 53317,
  hidden: false,
  theme: "light",
  accentColor: "indigo",
  fontSize: "medium",
  compactMode: false,
  startMinimized: false,
  allowedIps: [],
  blockedIps: [],
  retentionMonths: 5,
  syncFloor: 0,
  soundNotifications: true,
  desktopNotifications: true,
};

interface SettingsStore {
  settings: AppSettings;
  loading: boolean;
  error?: string;
  setSettings: (settings: AppSettings) => void;
  patchSettings: (settings: Partial<AppSettings>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  loading: false,
  setSettings: (settings) => set({ settings }),
  patchSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
