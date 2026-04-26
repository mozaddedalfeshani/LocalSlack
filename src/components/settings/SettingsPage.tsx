import { useState } from "react";
import { applySettings, useSettings } from "../../hooks/useSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { GeneralSettings } from "./GeneralSettings";
import { NetworkSettings } from "./NetworkSettings";

export function SettingsPage() {
  const { settings, patchSettings, save, loading, error } = useSettings();
  const [tab, setTab] = useState<"general" | "network" | "appearance">("general");
  const patch = (value: Partial<typeof settings>) => {
    const next = { ...settings, ...value };
    patchSettings(value);
    applySettings(next);
  };

  return (
    <section className="mx-auto max-w-3xl py-8">
      <h2 className="mb-9 text-center text-2xl font-light text-[#e4efeb]">Settings</h2>
      <div className="mb-5 flex justify-center gap-2">
        {(["general", "network", "appearance"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`settings-tab ${tab === item ? "active" : ""}`}
            onClick={() => setTab(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <div className="settings-card">
        {loading && <p className="text-text-muted">Loading settings...</p>}
        {error && <p className="text-error">{error}</p>}
        {tab === "general" && <GeneralSettings settings={settings} onChange={patch} />}
        {tab === "network" && <NetworkSettings settings={settings} onChange={patch} />}
        {tab === "appearance" && <AppearanceSettings settings={settings} onChange={patch} />}
        <button className="primary-button mt-6 w-full" onClick={() => save(settings)}>
          Save Settings
        </button>
      </div>
    </section>
  );
}
