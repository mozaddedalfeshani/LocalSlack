import { create } from "zustand";
import type { ChannelId } from "../types";

export type MainView = "channel" | "receive" | "send" | "clipboard" | "history" | "settings" | "dm";

interface UiStore {
  view: MainView;
  activeChannelId: ChannelId;
  activeDmDeviceId?: string;
  settingsOpen: boolean;
  clipboardOpen: boolean;
  toast?: string;
  setView: (view: MainView) => void;
  setChannel: (channelId: ChannelId) => void;
  setDirectMessage: (deviceId: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setClipboardOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  view: "channel",
  activeChannelId: "general",
  activeDmDeviceId: undefined,
  settingsOpen: false,
  clipboardOpen: false,
  setView: (view) => set({ view }),
  setChannel: (activeChannelId) => set({ activeChannelId, view: "channel" }),
  setDirectMessage: (activeDmDeviceId) => set({ activeDmDeviceId, view: "dm" }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setClipboardOpen: (clipboardOpen) => set({ clipboardOpen }),
  showToast: (toast) => {
    set({ toast });
    window.setTimeout(() => set({ toast: undefined }), 3000);
  },
  clearToast: () => set({ toast: undefined })
}));
