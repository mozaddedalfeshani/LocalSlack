import { applySettings, useSettings } from "../../hooks/useSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { GeneralSettings } from "./GeneralSettings";
import { NetworkSettings } from "./NetworkSettings";
import { User, Globe, Palette, Save } from "lucide-react";

export function SettingsPage() {
  const { settings, patchSettings, save, loading, error } = useSettings();

  const patch = (value: Partial<typeof settings>) => {
    const next = { ...settings, ...value };
    patchSettings(value);
    applySettings(next);
  };

  return (
    <section className="mx-auto max-w-3xl py-12 px-6 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="mb-16">
        <h2 className="text-4xl font-black tracking-tight text-text-primary">
          Settings
        </h2>
        <p className="mt-2 text-base text-text-muted">
          Manage your device preferences and network configuration.
        </p>
      </div>

      {loading && (
        <p className="text-text-muted animate-pulse">
          Loading your preferences...
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-error/10 p-4 text-sm text-error border border-error/20 mb-8">
          {error}
        </p>
      )}

      <div className="space-y-24 pb-32">
        {/* General Section */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <User size={22} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary">General</h3>
          </div>
          <GeneralSettings settings={settings} onChange={patch} />
        </div>

        {/* Appearance Section */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="mb-10 flex items-center gap-3 pt-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Palette size={22} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary">Appearance</h3>
          </div>
          <AppearanceSettings settings={settings} onChange={patch} />
        </div>

        {/* Network Section */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <div className="mb-10 flex items-center gap-3 pt-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Globe size={22} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary">Network</h3>
          </div>
          <NetworkSettings settings={settings} onChange={patch} />
        </div>
      </div>

      {/* Bottom-Right FAB Save Button */}
      <div className="fixed bottom-12 right-12 z-50">
        <button
          onClick={() => save(settings)}
          title="Save All Changes"
          className="group flex h-16 w-16 items-center justify-center rounded-[24px] bg-accent text-white shadow-2xl shadow-accent/40 transition-all hover:scale-110 active:scale-95 hover:shadow-accent/60 overflow-hidden"
        >
          <div className="relative flex items-center justify-center">
            <Save
              size={28}
              strokeWidth={2.5}
              className="transition-transform group-hover:scale-110"
            />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 -z-10 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </div>
    </section>
  );
}
