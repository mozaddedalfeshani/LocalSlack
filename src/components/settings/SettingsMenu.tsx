import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { applySettings, useSettings } from "../../hooks/useSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { GeneralSettings } from "./GeneralSettings";
import { NetworkSettings } from "./NetworkSettings";

export function SettingsMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { settings, patchSettings, save, loading, error } = useSettings();
  const [tab, setTab] = useState<"general" | "network" | "appearance">(
    "general",
  );
  if (!open) return null;
  const patch = (value: Partial<typeof settings>) => {
    const next = { ...settings, ...value };
    patchSettings(value);
    applySettings(next);
  };
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-[420px] max-w-full flex-col border-l border-border bg-bg-secondary shadow-panel">
      <header className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{t("settings.title")}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X size={18} />
        </button>
      </header>
      <div className="flex gap-2 border-b border-border p-3">
        {(["general", "network", "appearance"] as const).map((item) => (
          <button
            key={item}
            className={`secondary-button flex-1 ${tab === item ? "selected" : ""}`}
            onClick={() => setTab(item)}
          >
            {t(`settings.${item}`)}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading && <p className="text-text-muted">Loading settings...</p>}
        {error && <p className="text-error">{error}</p>}
        {tab === "general" && (
          <GeneralSettings settings={settings} onChange={patch} />
        )}
        {tab === "network" && (
          <NetworkSettings settings={settings} onChange={patch} />
        )}
        {tab === "appearance" && (
          <AppearanceSettings settings={settings} onChange={patch} />
        )}
      </div>
      <footer className="border-t border-border p-4">
        <button
          className="primary-button w-full"
          onClick={() => save(settings)}
        >
          {t("settings.save")}
        </button>
      </footer>
    </aside>
  );
}
