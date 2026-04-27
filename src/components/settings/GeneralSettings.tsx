import type { AppSettings } from "../../types";
import { RefreshCw, Check } from "lucide-react";

const adjectives = ["Bright", "Calm", "Clever", "Cozy", "Fast", "Gentle", "Happy", "Kind", "Lucky", "Mighty", "Quiet", "Rapid", "Shiny", "Sunny", "Swift"];
const nouns = ["Apple", "Berry", "Cloud", "Comet", "Daisy", "Falcon", "Mango", "Moon", "Nova", "Pear", "Pixel", "River", "Rocket", "Star", "Wave"];
const emojis = ["🌙", "⭐", "🚀", "🍐", "🍋", "🍉", "🫐", "🌿", "🔥", "💎", "🎧", "📡", "🧭", "⚡", "🪄", "🌊"];

function randomCuteName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

export function GeneralSettings({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  return (
    <div className="space-y-12">
      {/* Device Name Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary">Device Name</p>
          <p className="text-xs text-text-muted max-w-[200px]">How other devices will see you on the network.</p>
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
          <p className="text-xs text-text-muted">Pick a fun emoji to represent your device.</p>
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
          <p className="text-xs text-text-muted">Where received files will be stored.</p>
        </div>
        <div className="flex-1 max-w-sm">
          <input 
            className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60" 
            value={settings.savePath} 
            onChange={(e) => onChange({ savePath: e.target.value })} 
          />
        </div>
      </div>

      {/* Language Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary">App Language</p>
          <p className="text-xs text-text-muted">Choose your preferred interface language.</p>
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
            <p className="font-bold text-text-primary group-hover:text-accent transition-colors">Quick Save</p>
            <p className="text-xs text-text-muted">Automatically accept files from trusted devices.</p>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${settings.quickSave ? "bg-accent" : "bg-border/60"}`}>
            <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.quickSave ? "translate-x-5" : "translate-x-0"}`} />
            <input type="checkbox" className="hidden" checked={settings.quickSave} onChange={(e) => onChange({ quickSave: e.target.checked })} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="space-y-1">
            <p className="font-bold text-text-primary group-hover:text-accent transition-colors">Auto-open Files</p>
            <p className="text-xs text-text-muted">Launch files immediately after they are received.</p>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${settings.autoOpen ? "bg-accent" : "bg-border/60"}`}>
            <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.autoOpen ? "translate-x-5" : "translate-x-0"}`} />
            <input type="checkbox" className="hidden" checked={settings.autoOpen} onChange={(e) => onChange({ autoOpen: e.target.checked })} />
          </div>
        </label>
      </div>
    </div>
  );
}
