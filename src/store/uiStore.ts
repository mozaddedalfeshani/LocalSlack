import { create } from "zustand";
import type { ChannelId } from "../types";

type MainView = "channel" | "receive" | "send" | "clipboard" | "history" | "settings";

interface UiStore {
  view: MainView;
  activeChannelId: ChannelId;
  settingsOpen: boolean;
  clipboardOpen: boolean;
  toast?: string;
  setView: (view: MainView) => void;
  setChannel: (channelId: ChannelId) => void;
  setSettingsOpen: (open: boolean) => void;
  setClipboardOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  view: "channel",
  activeChannelId: "general",
  settingsOpen: false,
  clipboardOpen: false,
  setView: (view) => set({ view }),
  setChannel: (activeChannelId) => set({ activeChannelId, view: "channel" }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setClipboardOpen: (clipboardOpen) => set({ clipboardOpen }),
  showToast: (toast) => {
    set({ toast });
    window.setTimeout(() => set({ toast: undefined }), 3000);
  },
  clearToast: () => set({ toast: undefined })
}));
