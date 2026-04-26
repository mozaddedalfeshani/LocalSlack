import type { AppSettings } from "../../types";

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
    <div className="settings-grid">
      <label>
        Device Name
        <div className="flex gap-2">
          <input className="input" value={settings.deviceName} onChange={(e) => onChange({ deviceName: e.target.value })} />
          <button className="secondary-button shrink-0" type="button" onClick={() => onChange({ deviceName: randomCuteName() })}>
            Shuffle
          </button>
        </div>
      </label>
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Your Emoji</p>
        <div className="grid grid-cols-8 gap-2">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`emoji-choice ${settings.deviceEmoji === emoji ? "selected" : ""}`}
              onClick={() => onChange({ deviceEmoji: emoji })}
              aria-label={`Use ${emoji} as device emoji`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <label>Save Path<input className="input" value={settings.savePath} onChange={(e) => onChange({ savePath: e.target.value })} /></label>
      <label className="toggle"><input type="checkbox" checked={settings.quickSave} onChange={(e) => onChange({ quickSave: e.target.checked })} />Quick Save</label>
      <label className="toggle"><input type="checkbox" checked={settings.autoOpen} onChange={(e) => onChange({ autoOpen: e.target.checked })} />Auto-open received files</label>
      <label>Language<select className="input" value={settings.language} onChange={(e) => onChange({ language: e.target.value })}><option value="en">English</option><option value="bn">বাংলা</option></select></label>
      <label>Startup<select className="input" value={settings.startMinimized ? "minimized" : "normal"} onChange={(e) => onChange({ startMinimized: e.target.value === "minimized" })}><option value="normal">Normal</option><option value="minimized">Start minimized</option></select></label>
    </div>
  );
}
