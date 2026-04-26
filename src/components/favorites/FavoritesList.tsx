import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DeviceInfo } from "../../types";

export function FavoritesList({ devices, onSelect }: { devices: DeviceInfo[]; onSelect: (device: DeviceInfo) => void }) {
  const { t } = useTranslation();
  const favorites = devices.filter((device) => device.isFavorite);
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <Star size={14} /> {t("devices.favorites")}
      </h2>
      {favorites.length === 0 ? (
        <p className="text-xs text-text-muted">Pinned devices stay here.</p>
      ) : (
        <div className="space-y-1">
          {favorites.map((device) => (
            <button
              type="button"
              key={device.id}
              onClick={() => onSelect(device)}
              className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-surface"
            >
              {device.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
