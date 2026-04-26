import { create } from "zustand";
import type { DeviceInfo } from "../types";

interface DeviceStore {
  devices: DeviceInfo[];
  selectedDevice?: DeviceInfo;
  loading: boolean;
  error?: string;
  setDevices: (devices: DeviceInfo[]) => void;
  selectDevice: (device?: DeviceInfo) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  loading: false,
  setDevices: (devices) => set({ devices }),
  selectDevice: (selectedDevice) => set({ selectedDevice }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
