import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../../types";

export function NetworkSettings({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  const [ips, setIps] = useState<string[]>([]);
  useEffect(() => {
    invoke<string[]>("get_local_ip").then(setIps).catch(() => setIps([]));
  }, []);
  return (
    <div className="settings-grid">
      <label>Port<input className="input" type="number" min={1} max={65535} value={settings.port} onChange={(e) => onChange({ port: Number(e.target.value) })} /></label>
      <label className="toggle"><input type="checkbox" checked={settings.hidden} onChange={(e) => onChange({ hidden: e.target.checked })} />Hide from network</label>
      <label>Allowed IPs<input className="input" value={settings.allowedIps.join(", ")} onChange={(e) => onChange({ allowedIps: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} /></label>
      <label>Blocked IPs<input className="input" value={settings.blockedIps.join(", ")} onChange={(e) => onChange({ blockedIps: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} /></label>
      <div className="rounded-md bg-bg-surface p-3 text-sm text-text-secondary"><p className="mb-2 font-medium text-text-primary">Local IP addresses</p>{ips.length ? ips.map((ip) => <p key={ip}>{ip}</p>) : <p>No active LAN address found.</p>}</div>
    </div>
  );
}
