import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../../types";
import { Globe, Shield, Lock } from "lucide-react";

export function NetworkSettings({ settings, onChange }: { settings: AppSettings; onChange: (patch: Partial<AppSettings>) => void }) {
  const [ips, setIps] = useState<string[]>([]);
  
  useEffect(() => {
    invoke<string[]>("get_local_ip").then(setIps).catch(() => setIps([]));
  }, []);

  return (
    <div className="space-y-12">
      {/* Port Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary flex items-center gap-2">
            <Globe size={16} className="text-accent" />
            Server Port
          </p>
          <p className="text-xs text-text-muted">The internal port SwiftShare uses to communicate.</p>
        </div>
        <div className="flex-1 max-w-[120px]">
          <input 
            type="number" 
            min={1} 
            max={65535}
            className="h-10 w-full rounded-xl border border-border/40 bg-bg-surface px-4 text-sm text-text-primary outline-none focus:border-accent/60" 
            value={settings.port} 
            onChange={(e) => onChange({ port: Number(e.target.value) })} 
          />
        </div>
      </div>

      {/* Allowed IPs Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            Allowed List
          </p>
          <p className="text-xs text-text-muted">Only these IP addresses can send you files.</p>
        </div>
        <div className="flex-1 max-w-sm">
          <textarea 
            rows={2}
            placeholder="e.g. 192.168.1.5, 10.0.0.42"
            className="w-full rounded-xl border border-border/40 bg-bg-surface p-3 text-sm text-text-primary outline-none focus:border-accent/60 resize-none" 
            value={settings.allowedIps.join(", ")} 
            onChange={(e) => onChange({ allowedIps: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} 
          />
        </div>
      </div>

      {/* Blocked IPs Section */}
      <div className="flex items-start justify-between gap-8">
        <div className="space-y-1">
          <p className="font-bold text-text-primary flex items-center gap-2">
            <Lock size={16} className="text-accent" />
            Blocked List
          </p>
          <p className="text-xs text-text-muted">Prevent specific addresses from connecting.</p>
        </div>
        <div className="flex-1 max-w-sm">
          <textarea 
            rows={2}
            placeholder="e.g. 192.168.1.10"
            className="w-full rounded-xl border border-border/40 bg-bg-surface p-3 text-sm text-text-primary outline-none focus:border-accent/60 resize-none" 
            value={settings.blockedIps.join(", ")} 
            onChange={(e) => onChange({ blockedIps: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} 
          />
        </div>
      </div>

      {/* Visibility Toggle Section */}
      <div className="space-y-6 pt-4 border-t border-border/10">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="space-y-1">
            <p className="font-bold text-text-primary group-hover:text-accent transition-colors">Stealth Mode</p>
            <p className="text-xs text-text-muted">Hide your device from network discovery scans.</p>
          </div>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${settings.hidden ? "bg-accent" : "bg-border/60"}`}>
            <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${settings.hidden ? "translate-x-5" : "translate-x-0"}`} />
            <input type="checkbox" className="hidden" checked={settings.hidden} onChange={(e) => onChange({ hidden: e.target.checked })} />
          </div>
        </label>
      </div>

      {/* Information Section */}
      <div className="rounded-2xl bg-bg-elevated/20 p-6 border border-border/10">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Your Network Identity</p>
        <div className="flex flex-wrap gap-2">
          {ips.map((ip) => (
            <div key={ip} className="rounded-lg bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary border border-border/40">
              {ip}
            </div>
          ))}
          {ips.length === 0 && <p className="text-xs text-text-muted italic">Identifying local network address...</p>}
        </div>
      </div>
    </div>
  );
}
