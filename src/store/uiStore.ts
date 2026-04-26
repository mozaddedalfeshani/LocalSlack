import { create } from "zustand";

type MainView = "send" | "clipboard" | "history";

interface UiStore {
  view: MainView;
  settingsOpen: boolean;
  clipboardOpen: boolean;
  toast?: string;
  setView: (view: MainView) => void;
  setSettingsOpen: (open: boolean) => void;
  setClipboardOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  view: "send",
  settingsOpen: false,
  clipboardOpen: false,
  setView: (view) => set({ view }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setClipboardOpen: (clipboardOpen) => set({ clipboardOpen }),
  showToast: (toast) => {
    set({ toast });
    window.setTimeout(() => set({ toast: undefined }), 3000);
  },
  clearToast: () => set({ toast: undefined })
}));
