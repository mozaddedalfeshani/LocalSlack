import { AlertTriangle, CheckCircle2, RefreshCw, Server, Wifi, X } from "lucide-react";
import type { NetworkStatus } from "../../types";

interface Props {
  open: boolean;
  status?: NetworkStatus;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  onClose: () => void;
}

function StatePill({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${ok ? "border-success/40 bg-success/10 text-text-primary" : "border-warning/40 bg-warning/10 text-text-secondary"}`}>
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
}

export function StartupNetworkDialog({ open, status, loading, error, onRefresh, onClose }: Props) {
  if (!open) return null;

  const ready = Boolean(status && status.hosting && status.discoveryRunning && status.advertising && status.localIps.length > 0);
  const ips = status?.localIps.length ? status.localIps.join(", ") : "No LAN address";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] rounded-md border border-border bg-bg-surface shadow-panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-accent/15 text-accent">
              <Wifi size={21} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Network Status</h2>
              <p className="text-sm text-text-muted">{status?.deviceName ?? "LocalSlack"}</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close network status">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          {error && (
            <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-text-secondary">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatePill ok={Boolean(status?.hosting)} label="Hosting" />
            <StatePill ok={Boolean(status?.discoveryRunning)} label="Discovery" />
            <StatePill ok={Boolean(status?.advertising)} label={status?.hidden ? "Hidden" : "Visible"} />
          </div>

          <div className="rounded-md border border-border/60 bg-bg-elevated/55 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Server size={17} />
              <span>{ready ? "Ready on local network" : loading ? "Checking network" : "Needs attention"}</span>
            </div>
            <dl className="grid gap-2 text-sm text-text-secondary">
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Address</dt>
                <dd className="text-right">{ips}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Port</dt>
                <dd>{status?.port ?? "..."}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Service</dt>
                <dd>{status?.serviceType ?? "_localslack._tcp.local."}</dd>
              </div>
            </dl>
          </div>

          {status?.issues.length ? (
            <div className="grid gap-2">
              {status.issues.map((issue) => (
                <div key={issue} className="flex items-center gap-2 text-sm text-text-secondary">
                  <AlertTriangle size={15} className="text-warning" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
