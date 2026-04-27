import { listen, TauriEvent } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { DeviceInfo, SelectedFile } from "../../types";
import { selectedFilesFromPaths } from "../../utils/fileUtils";
import logo from "../../assets/logo.png";
import { Clipboard, FileText, Folder, List } from "lucide-react";

interface Props {
  devices: DeviceInfo[];
  selectedDevice?: DeviceInfo;
  onSelect: (device: DeviceInfo) => void;
  onFiles: (files: SelectedFile[]) => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClipboard: () => void;
}

export function DiscoveryRadar({
  devices,
  selectedDevice,
  onSelect,
  onFiles,
  onPickFiles,
  onPickFolder,
  onClipboard
}: Props) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const unlisteners = [
      listen(TauriEvent.DRAG_ENTER, () => setDragging(true)),
      listen(TauriEvent.DRAG_LEAVE, () => setDragging(false)),
      listen<{ paths: string[] }>(TauriEvent.DRAG_DROP, async (event) => {
        setDragging(false);
        const paths = event.payload.paths ?? [];
        if (paths.length > 0) {
          const selected = await selectedFilesFromPaths(paths);
          onFiles(selected);
        }
      })
    ];
    return () => {
      unlisteners.forEach((u) => u.then((f) => f()));
    };
  }, [onFiles]);

  return (
    <div
      className={`relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 transition-all duration-500 ${
        dragging ? "border-accent bg-accent/5 scale-[0.99]" : "border-border/40 bg-bg-surface/30"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      {/* Selection Bar */}
      <div className="absolute top-6 z-20 flex gap-2 rounded-2xl border border-border/40 bg-bg-surface/80 p-1.5 backdrop-blur-md">
        <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-bg-elevated" onClick={onPickFiles}>
          <FileText size={18} className="text-accent" />
          <span>File</span>
        </button>
        <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-bg-elevated" onClick={onPickFolder}>
          <Folder size={18} className="text-accent" />
          <span>Folder</span>
        </button>
        <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-bg-elevated" onClick={onClipboard}>
          <List size={18} className="text-accent" />
          <span>Text</span>
        </button>
        <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-bg-elevated" onClick={onClipboard}>
          <Clipboard size={18} className="text-accent" />
          <span>Paste</span>
        </button>
      </div>

      {/* Radar Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-[1px] w-[1px]">
          <div className="radar-pulse absolute h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20" />
          <div className="radar-pulse absolute h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" style={{ animationDelay: "1s" }} />
          <div className="radar-pulse absolute h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/5" style={{ animationDelay: "2s" }} />
          <div className="radar-scan absolute h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </div>

      {/* Central Drop Zone Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="group relative h-32 w-32 cursor-pointer transition-transform hover:scale-110" onClick={onPickFiles}>
          <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl transition-opacity group-hover:opacity-40" />
          <img src={logo} alt="SwiftShare" className="relative h-full w-full object-contain" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-text-primary">
            {dragging ? "Drop to Share" : "Discovery Mode"}
          </h3>
          <p className="text-sm font-medium text-text-muted">
            {dragging ? "Release files here" : "Drop files or click to browse"}
          </p>
        </div>
      </div>

      {/* Devices in Orbit */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {devices.map((device, index) => {
          const angle = (index / devices.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 180;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const active = selectedDevice?.id === device.id;

          return (
            <button
              key={device.id}
              onClick={() => onSelect(device)}
              className={`pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 transition-all duration-500 hover:scale-110 ${
                active ? "scale-125 z-20" : "opacity-80"
              }`}
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) ${active ? "scale(1.25)" : ""}`
              }}
            >
              <div className={`grid h-14 w-14 place-items-center rounded-2xl border-2 transition-all ${
                active ? "border-accent bg-accent/20 shadow-[0_0_20px_rgba(var(--accent),0.3)]" : "border-border/40 bg-bg-surface backdrop-blur-sm"
              }`}>
                <span className="text-2xl">{device.emoji || "💻"}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                active ? "bg-accent text-[#241014]" : "bg-bg-elevated text-text-secondary"
              }`}>
                {device.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
