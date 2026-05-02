import { useTranslation } from "react-i18next";
import type { DeviceInfo } from "../../types";
import { sortDevices } from "../../utils/deviceUtils";
import { DeviceCard } from "./DeviceCard";

interface Props {
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
}

export function DeviceList({
  devices,
  selected,
  loading,
  error,
  onSelect,
  onToggleFavorite,
}: Props) {
  const { t } = useTranslation();
  if (loading)
    return (
      <p className="p-3 text-sm text-text-muted">{t("devices.searching")}</p>
    );
  if (error) return <p className="p-3 text-sm text-error">{error}</p>;
  if (devices.length === 0)
    return (
      <p className="p-3 text-sm text-text-muted">{t("devices.noDevices")}</p>
    );
  return (
    <div className="space-y-2">
      {sortDevices(devices).map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          selected={selected?.id === device.id}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
