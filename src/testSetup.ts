import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((command: string) => {
    if (command === "get_settings") {
      return Promise.resolve({
        deviceName: "LocalSlack Device",
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
        blockedIps: [],
        retentionMonths: 5
      });
    }
    if (command === "get_network_status") {
      return Promise.resolve({
        deviceName: "LocalSlack Device",
        hidden: false,
        hosting: true,
        discoveryRunning: true,
        advertising: true,
        localIps: ["192.168.1.20"],
        port: 53317,
        serviceType: "_localslack._tcp.local.",
        issues: []
      });
    }
    if (command === "get_history" || command === "get_devices" || command === "scan_network_devices" || command === "get_local_ip") return Promise.resolve([]);
    return Promise.resolve(undefined);
  })
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined)),
  TauriEvent: {
    DRAG_ENTER: "tauri://drag-enter",
    DRAG_LEAVE: "tauri://drag-leave",
    DRAG_DROP: "tauri://drag-drop"
  }
}));
