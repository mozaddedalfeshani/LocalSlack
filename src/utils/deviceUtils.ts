import type { DeviceInfo } from "../types";

export function isOnline(device: DeviceInfo): boolean {
  return Math.floor(Date.now() / 1000) - device.lastSeen <= 30;
}

export function normalizedDeviceType(device: DeviceInfo): string {
  return String(device.deviceType).toLowerCase();
}

export function sortDevices(devices: DeviceInfo[]): DeviceInfo[] {
  return [...devices].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.lastSeen - a.lastSeen);
}
