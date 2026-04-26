import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useDeviceStore } from "../store/deviceStore";
import type { DeviceInfo } from "../types";

export function useDevices() {
  const store = useDeviceStore();
  useEffect(() => {
    let disposed = false;
    store.setLoading(true);
    invoke<DeviceInfo[]>("get_devices")
      .then((devices) => !disposed && store.setDevices(devices))
      .catch((error) => !disposed && store.setError(String(error)))
      .finally(() => !disposed && store.setLoading(false));
    const unlisten = listen<DeviceInfo[]>("devices-updated", (event) => store.setDevices(event.payload));
    return () => {
      disposed = true;
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, []);
  return store;
}
