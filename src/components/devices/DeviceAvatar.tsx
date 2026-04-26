import { Globe, Monitor, Smartphone } from "lucide-react";
import type { DeviceInfo } from "../../types";
import { normalizedDeviceType } from "../../utils/deviceUtils";

export function DeviceAvatar({ device }: { device: DeviceInfo }) {
  const type = normalizedDeviceType(device);
  const Icon = type === "mobile" ? Smartphone : type === "web" ? Globe : Monitor;
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-bg-elevated text-accent">
      <Icon size={20} />
    </div>
  );
}
