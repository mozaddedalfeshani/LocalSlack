import type { AppSettings } from "../../types";

export function GeneralSettings({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  return (
    <div className="settings-grid">
      <label>Device Name<input className="input" value={settings.deviceName} onChange={(e) => onChange({ deviceName: e.target.value })} /></label>
      <label>Save Path<input className="input" value={settings.savePath} onChange={(e) => onChange({ savePath: e.target.value })} /></label>
      <label className="toggle"><input type="checkbox" checked={settings.quickSave} onChange={(e) => onChange({ quickSave: e.target.checked })} />Quick Save</label>
      <label className="toggle"><input type="checkbox" checked={settings.autoOpen} onChange={(e) => onChange({ autoOpen: e.target.checked })} />Auto-open received files</label>
      <label>Language<select className="input" value={settings.language} onChange={(e) => onChange({ language: e.target.value })}><option value="en">English</option><option value="bn">বাংলা</option></select></label>
      <label>Startup<select className="input" value={settings.startMinimized ? "minimized" : "normal"} onChange={(e) => onChange({ startMinimized: e.target.value === "minimized" })}><option value="normal">Normal</option><option value="minimized">Start minimized</option></select></label>
    </div>
  );
}
