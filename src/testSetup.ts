import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((command: string) => {
    if (command === "get_settings") {
      return Promise.resolve({
        deviceName: "SwiftShare Device",
        deviceEmoji: "🚀",
        savePath: "",
        quickSave: false,
        quickSaveMode: "off",
        autoOpen: false,
        language: "en",
        port: 53317,
        hidden: false,
        theme: "dark",
        accentColor: "indigo",
        fontSize: "medium",
        compactMode: false,
        startMinimized: false,
        allowedIps: [],
        blockedIps: []
      });
    }
    if (command === "get_history" || command === "get_devices" || command === "get_local_ip") return Promise.resolve([]);
    return Promise.resolve(undefined);
  })
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined))
}));
