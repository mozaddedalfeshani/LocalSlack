import type { AppSettings } from "../../types";

const accents = ["coral", "indigo", "violet", "emerald", "rose", "amber", "sky"];

export function AppearanceSettings({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  return (
    <div className="settings-grid">
      <label>Theme<select className="input" value={settings.theme} onChange={(e) => onChange({ theme: e.target.value as AppSettings["theme"] })}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>
      <label>Font Size<select className="input" value={settings.fontSize} onChange={(e) => onChange({ fontSize: e.target.value as AppSettings["fontSize"] })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
      <div><p className="mb-2 text-sm font-medium">Accent Color</p><div className="flex gap-2">{accents.map((accent) => <button key={accent} type="button" title={accent} onClick={() => onChange({ accentColor: accent })} className={`h-8 w-8 rounded-md border ${settings.accentColor === accent ? "border-text-primary" : "border-border"}`} data-accent={accent} />)}</div></div>
      <label className="toggle"><input type="checkbox" checked={settings.compactMode} onChange={(e) => onChange({ compactMode: e.target.checked })} />Compact mode</label>
    </div>
  );
}
