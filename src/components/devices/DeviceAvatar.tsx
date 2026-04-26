import { Globe, Monitor, Smartphone } from "lucide-react";
import type { DeviceInfo } from "../../types";
import { normalizedDeviceType } from "../../utils/deviceUtils";

export function DeviceAvatar({ device }: { device: DeviceInfo }) {
  const type = normalizedDeviceType(device);
  const Icon = type === "mobile" ? Smartphone : type === "web" ? Globe : Monitor;
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#2c4a42] text-[#8addd0]">
      {device.emoji ? <span className="text-2xl">{device.emoji}</span> : <Icon size={22} strokeWidth={2.8} />}
    </div>
  );
}
