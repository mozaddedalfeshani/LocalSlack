import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { DeviceInfo } from "../../types";
import { isOnline } from "../../utils/deviceUtils";
import { DeviceAvatar } from "./DeviceAvatar";

interface Props {
  device: DeviceInfo;
  selected?: boolean;
  onSelect?: (device: DeviceInfo) => void;
  onToggleFavorite?: (device: DeviceInfo) => void;
}

export function DeviceCard({ device, selected, onSelect, onToggleFavorite }: Props) {
  const online = isOnline(device);
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      type="button"
      onClick={() => onSelect?.(device)}
      className={`w-full rounded-md border p-3 text-left transition ${
        selected ? "border-accent bg-accent/10" : "border-border bg-bg-surface hover:border-accent/50"
      } ${online ? "" : "opacity-55"}`}
    >
      <div className="flex items-center gap-3">
        <DeviceAvatar device={device} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-text-primary">{device.name}</span>
            <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-success" : "bg-text-muted"}`} />
          </div>
          <p className="truncate text-xs text-text-muted">{device.ip}:{device.port}</p>
        </div>
        <span
          role="button"
          tabIndex={0}
          aria-label={device.isFavorite ? "Remove favorite" : "Add favorite"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(device);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onToggleFavorite?.(device);
          }}
          className="rounded-md p-1 text-text-secondary hover:bg-bg-elevated"
        >
          <Star size={18} fill={device.isFavorite ? "currentColor" : "none"} />
        </span>
      </div>
    </motion.button>
  );
}
