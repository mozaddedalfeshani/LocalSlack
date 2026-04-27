import type { AppSettings } from "../../types";

const accents = ["coral", "indigo", "violet", "emerald", "rose", "amber", "sky"];

export function AppearanceSettings({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  return (
    <div className="space-y-12">
      {/* Theme Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary">Interface Theme</p>
          <p className="text-xs text-text-muted">Choose between light, dark, or follow system.</p>
        </div>
        <div className="flex-1 max-w-sm">
          <select 
            className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60 appearance-none" 
            value={settings.theme} 
            onChange={(e) => onChange({ theme: e.target.value as AppSettings["theme"] })}
          >
            <option value="dark">Deep Night (Dark)</option>
            <option value="light">Pure Snow (Light)</option>
            <option value="system">Auto System Sync</option>
          </select>
        </div>
      </div>

      {/* Font Size Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary">Text Scaling</p>
          <p className="text-xs text-text-muted">Adjust the size of the interface text.</p>
        </div>
        <div className="flex-1 max-w-sm">
          <select 
            className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60 appearance-none" 
            value={settings.fontSize} 
            onChange={(e) => onChange({ fontSize: e.target.value as AppSettings["fontSize"] })}
          >
            <option value="small">Small & Precise</option>
            <option value="medium">Default Balance</option>
            <option value="large">Large & Accessible</option>
          </select>
        </div>
      </div>

      {/* Accent Color Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary">Brand Accent</p>
          <p className="text-xs text-text-muted">Personalize the primary color theme.</p>
        </div>
        <div className="flex-1 max-w-sm flex flex-wrap gap-3 justify-end">
          {accents.map((accent) => (
            <button 
              key={accent} 
              type="button" 
              title={accent} 
              onClick={() => onChange({ accentColor: accent })} 
              className={`h-10 w-10 rounded-2xl border-2 transition-all hover:scale-110 ${
                settings.accentColor === accent 
                  ? "border-text-primary scale-125 shadow-lg shadow-accent/10" 
                  : "border-border/20 bg-bg-surface"
              }`} 
              data-accent={accent} 
            />
          ))}
        </div>
      </div>

      {/* Toggles Section */}
      <div className="space-y-6 pt-4 border-t border-border/10">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="space-y-1">
            <p className="font-bold text-text-primary group-hover:text-accent transition-colors">Compact Layout</p>
            <p className="text-xs text-text-muted">Reduce spacing to show more content at once.</p>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${settings.compactMode ? "bg-accent" : "bg-border/60"}`}>
            <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.compactMode ? "translate-x-5" : "translate-x-0"}`} />
            <input type="checkbox" className="hidden" checked={settings.compactMode} onChange={(e) => onChange({ compactMode: e.target.checked })} />
          </div>
        </label>
      </div>
    </div>
  );
}
