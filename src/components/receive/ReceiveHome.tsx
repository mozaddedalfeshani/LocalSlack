import { Clock3, ShieldCheck, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import logo from "../../assets/logo.png";

type QuickSaveMode = "off" | "favorites" | "on";

interface Props {
  deviceName: string;
  emoji?: string;
  status: string;
  quickSaveMode: QuickSaveMode;
  onQuickSaveMode: (mode: QuickSaveMode) => void;
  onHistory: () => void;
}

export function ReceiveHome({
  deviceName,
  emoji,
  status,
  quickSaveMode,
  onQuickSaveMode,
  onHistory,
}: Props) {
  const [localIp, setLocalIp] = useState<string>("");
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    invoke<{ localIps: string[] }>("get_network_status")
      .then((s) => {
        if (s.localIps[0]) setLocalIp(s.localIps[0]);
      })
      .catch(() => undefined);
  }, []);

  const segments: Array<{
    id: QuickSaveMode;
    label: string;
    icon: typeof ShieldCheck;
  }> = [
    { id: "off", label: "Off", icon: ShieldCheck },
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "on", label: "On", icon: Zap },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-between py-10 px-6">
      {/* Center: logo + name + IP */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <button
          type="button"
          onClick={() => setSpinning((v) => !v)}
          className="relative focus:outline-none"
          title="Toggle animation"
        >
          <img
            src={logo}
            alt="LocalSlack"
            className={`h-28 w-28 rounded-full object-cover shadow-2xl transition-transform ${
              spinning ? "animate-spin-slow" : ""
            }`}
            style={{ animationDuration: spinning ? "15s" : undefined }}
          />
          {emoji && (
            <span className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full border-2 border-border bg-bg-surface text-xl shadow-md">
              {emoji}
            </span>
          )}
        </button>

        <div>
          <p className="text-[2.8rem] font-bold leading-tight text-text-primary">
            {deviceName || "LocalSlack"}
          </p>
          {localIp && (
            <p className="mt-1 text-2xl text-text-muted">#{localIp}</p>
          )}
          <p className="mt-2 text-sm font-medium text-text-muted">{status}</p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-sm space-y-4">
        {/* Quick Save segmented control */}
        <div>
          <p className="mb-2 text-center text-sm font-medium text-text-muted">
            Quick Save
          </p>
          <div className="flex overflow-hidden rounded-full border border-border/60 bg-bg-surface">
            {segments.map((seg) => {
              const Icon = seg.icon;
              const active = quickSaveMode === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => onQuickSaveMode(seg.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-white"
                      : "text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                  }`}
                >
                  <Icon size={14} />
                  {seg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* History button */}
        <button
          type="button"
          onClick={onHistory}
          className="secondary-button w-full justify-center gap-2"
        >
          <Clock3 size={17} />
          Transfer History
        </button>
      </div>
    </div>
  );
}
