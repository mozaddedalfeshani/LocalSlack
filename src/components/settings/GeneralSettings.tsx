import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AppSettings } from "../../types";

const adjectives = [
  "Bright",
  "Calm",
  "Clever",
  "Cozy",
  "Fast",
  "Gentle",
  "Happy",
  "Kind",
  "Lucky",
  "Mighty",
  "Quiet",
  "Rapid",
  "Shiny",
  "Sunny",
  "Swift",
];
const nouns = [
  "Apple",
  "Berry",
  "Cloud",
  "Comet",
  "Daisy",
  "Falcon",
  "Mango",
  "Moon",
  "Nova",
  "Pear",
  "Pixel",
  "River",
  "Rocket",
  "Star",
  "Wave",
];
const emojis = [
  "🌙",
  "⭐",
  "🚀",
  "🍐",
  "🍋",
  "🍉",
  "🫐",
  "🌿",
  "🔥",
  "💎",
  "🎧",
  "📡",
  "🧭",
  "⚡",
  "🪄",
  "🌊",
];

function randomCuteName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

export function GeneralSettings({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleFactoryReset = async () => {
    setResetting(true);
    try {
      await invoke("factory_reset");
    } catch (err) {
      toast.error(String(err));
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <>
      <div className="space-y-12">
        {/* Device Name Section */}
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-1">
            <p className="font-bold text-text-primary">Device Name</p>
            <p className="text-xs text-text-muted max-w-[200px]">
              How other devices will see you on the network.
            </p>
          </div>
          <div className="flex-1 max-w-sm flex gap-2">
            <input
              className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60"
              value={settings.deviceName}
              onChange={(e) => onChange({ deviceName: e.target.value })}
            />
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg-elevated transition hover:bg-bg-surface border border-border/40"
              onClick={() => onChange({ deviceName: randomCuteName() })}
            >
              <RefreshCw size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Emoji Selection Section */}
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-1">
            <p className="font-bold text-text-primary">Identity Emoji</p>
            <p className="text-xs text-text-muted">
              Pick a fun emoji to represent your device.
            </p>
          </div>
          <div className="flex-1 max-w-sm flex flex-wrap gap-2 justify-end">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className={`grid h-10 w-10 place-items-center rounded-xl border transition-all ${
                  settings.deviceEmoji === emoji
                    ? "border-accent bg-accent/10 shadow-lg shadow-accent/5"
                    : "border-border/40 bg-bg-surface hover:bg-bg-elevated"
                }`}
                onClick={() => onChange({ deviceEmoji: emoji })}
              >
                <span className="text-xl">{emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save Path Section */}
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-1">
            <p className="font-bold text-text-primary">Download Folder</p>
            <p className="text-xs text-text-muted">
              Where received files will be stored.
            </p>
          </div>
          <div className="flex-1 max-w-sm">
            <input
              className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60"
              value={settings.savePath}
              onChange={(e) => onChange({ savePath: e.target.value })}
            />
          </div>
        </div>

        {/* Retention Section */}
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-1">
            <p className="font-bold text-text-primary">Channel Retention</p>
            <p className="text-xs text-text-muted max-w-[220px]">
              Auto-remove old channel messages and saved assets.
            </p>
          </div>
          <div className="flex-1 max-w-sm">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={24}
                value={settings.retentionMonths}
                onChange={(e) =>
                  onChange({ retentionMonths: Number(e.target.value) })
                }
                className="w-full accent-[rgb(var(--accent))]"
              />
              <span className="w-20 text-right text-sm font-semibold text-text-primary">
                {settings.retentionMonths} mo
              </span>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="flex items-start justify-between gap-8">
          <div className="space-y-1">
            <p className="font-bold text-text-primary">App Language</p>
            <p className="text-xs text-text-muted">
              Choose your preferred interface language.
            </p>
          </div>
          <div className="flex-1 max-w-sm">
            <select
              className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60 appearance-none"
              value={settings.language}
              onChange={(e) => onChange({ language: e.target.value })}
            >
              <option value="en">English (US)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>
        </div>

        {/* Toggles Section */}
        <div className="space-y-6 pt-4 border-t border-border/10">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="space-y-1">
              <p className="font-bold text-text-primary group-hover:text-accent transition-colors">
                Quick Save
              </p>
              <p className="text-xs text-text-muted">
                Automatically accept files from trusted devices.
              </p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.quickSave ? "bg-accent" : "bg-border/60"}`}
            >
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.quickSave ? "translate-x-5" : "translate-x-0"}`}
              />
              <input
                type="checkbox"
                className="hidden"
                checked={settings.quickSave}
                onChange={(e) => onChange({ quickSave: e.target.checked })}
              />
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div className="space-y-1">
              <p className="font-bold text-text-primary group-hover:text-accent transition-colors">
                Auto-open Files
              </p>
              <p className="text-xs text-text-muted">
                Launch files immediately after they are received.
              </p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.autoOpen ? "bg-accent" : "bg-border/60"}`}
            >
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.autoOpen ? "translate-x-5" : "translate-x-0"}`}
              />
              <input
                type="checkbox"
                className="hidden"
                checked={settings.autoOpen}
                onChange={(e) => onChange({ autoOpen: e.target.checked })}
              />
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div className="space-y-1">
              <p className="font-bold text-text-primary group-hover:text-accent transition-colors">
                Desktop Notifications
              </p>
              <p className="text-xs text-text-muted">
                Show notifications on your desktop for new messages and transfers.
              </p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.desktopNotifications ? "bg-accent" : "bg-border/60"}`}
            >
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.desktopNotifications ? "translate-x-5" : "translate-x-0"}`}
              />
              <input
                type="checkbox"
                className="hidden"
                checked={settings.desktopNotifications}
                onChange={(e) => onChange({ desktopNotifications: e.target.checked })}
              />
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div className="space-y-1">
              <p className="font-bold text-text-primary group-hover:text-accent transition-colors">
                Notification Sounds
              </p>
              <p className="text-xs text-text-muted">
                Play a sound when you receive a message or a file transfer request.
              </p>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.soundNotifications ? "bg-accent" : "bg-border/60"}`}
            >
              <div
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.soundNotifications ? "translate-x-5" : "translate-x-0"}`}
              />
              <input
                type="checkbox"
                className="hidden"
                checked={settings.soundNotifications}
                onChange={(e) => onChange({ soundNotifications: e.target.checked })}
              />
            </div>
          </label>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-error/20">
          <div className="flex items-start justify-between gap-8">
            <div className="space-y-1">
              <p className="font-bold text-error">Factory Reset</p>
              <p className="text-xs text-text-muted max-w-[220px]">
                Wipe all local data — channels, messages, history, received
                files — and restart the app.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetDialog(true)}
              className="flex h-10 items-center gap-2 rounded-xl border border-error/40 bg-error/10 px-4 text-sm font-semibold text-error transition-colors hover:bg-error/20"
            >
              <Trash2 size={15} />
              Reset app
            </button>
          </div>
        </div>
      </div>

      {/* Factory Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border/60 bg-bg-primary p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-error/10 text-error">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Reset everything?
                </h2>
                <p className="text-xs text-text-muted">This cannot be undone</p>
              </div>
            </div>

            <p className="mb-2 text-sm text-text-secondary">
              The following will be permanently deleted:
            </p>
            <ul className="mb-6 space-y-1 text-sm text-text-muted">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-error/60" />
                All channel messages and shared files
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-error/60" />
                All direct messages
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-error/60" />
                Transfer history
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-error/60" />
                Received files from disk
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-error/60" />
                Saved favorites &amp; settings
              </li>
            </ul>

            <p className="mb-6 text-sm font-semibold text-text-primary">
              The app will restart automatically.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetDialog(false)}
                className="flex-1 rounded-xl border border-border/60 bg-bg-surface py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-elevated disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleFactoryReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-error py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {resetting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {resetting ? "Resetting…" : "Reset & Restart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
