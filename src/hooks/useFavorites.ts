import { invoke } from "@tauri-apps/api/core";
import type { DeviceInfo } from "../types";

export function useFavorites() {
  return {
    add: (device: DeviceInfo) => invoke("add_favorite", { device }),
    remove: (deviceId: string) => invoke("remove_favorite", { deviceId }),
    list: () => invoke<DeviceInfo[]>("get_favorites"),
  };
}
