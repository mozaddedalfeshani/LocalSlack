import { useEffect, useState } from "react";
import type { DeviceInfo, SelectedFile } from "../../types";
import { filesFromList, selectedFilesFromPaths } from "../../utils/fileUtils";
import logo from "../../assets/logo.png";
import { FileText, Folder, List, X } from "lucide-react";

interface Props {
  devices: DeviceInfo[];
  selectedDevice?: DeviceInfo;
  files: SelectedFile[];
  onSelect: (device: DeviceInfo) => void;
  onFiles: (files: SelectedFile[]) => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClipboard: () => void;
  onRemoveAll: () => void;
  onRemoveFile: (id: string) => void;
}

export function DiscoveryRadar({
  devices,
  selectedDevice,
  files,
  onSelect,
  onFiles,
  onPickFiles,
  onPickFolder,
  onClipboard,
  onRemoveAll,
  onRemoveFile
}: Props) {
  const [dragging, setDragging] = useState(false);

  const appendDedupedFiles = (incoming: SelectedFile[]) => {
    if (incoming.length === 0) return;
    const existingPaths = new Set(files.map((item) => item.path));
    const deduped = incoming.filter((item, index, array) =>
      !existingPaths.has(item.path) &&
      array.findIndex((candidate) => candidate.path === item.path) === index
    );
    if (deduped.length > 0) onFiles(deduped);
  };

  const normalizeDropPaths = (payload: unknown): string[] => {
    if (Array.isArray(payload)) return payload.filter((value): value is string => typeof value === "string");
    if (!payload || typeof payload !== "object") return [];
    const payloadWithPaths = payload as { paths?: unknown; path?: unknown };
    if (Array.isArray(payloadWithPaths.paths)) {
      return payloadWithPaths.paths.filter((value): value is string => typeof value === "string");
    }
    if (typeof payloadWithPaths.path === "string") {
      return [payloadWithPaths.path];
    }
    return [];
  };

  const handleDropFiles = async (dataTransfer: DataTransfer | null) => {
    if (!dataTransfer) return;
    const droppedFromBrowser = filesFromList(dataTransfer.files);
    if (droppedFromBrowser.length > 0) {
      appendDedupedFiles(droppedFromBrowser);
      return;
    }
    const fallbackPaths = Array.from(dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((path): path is string => Boolean(path));
    if (fallbackPaths.length === 0) return;
    try {
      const selected = await selectedFilesFromPaths(fallbackPaths);
      appendDedupedFiles(selected);
    } catch (err) {
      console.error("Failed to process dropped file paths:", err);
    }
  };
  
  const totalSize = files.reduce((acc, f) => acc + (f.file.size || 0), 0);
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  useEffect(() => {
    let unlisteners: Array<Promise<() => void>> = [];

    async function setupListeners() {
      const { listen } = await import("@tauri-apps/api/event");

      unlisteners.push(listen("tauri://drag-enter", () => setDragging(true)));
      unlisteners.push(listen("tauri://drag-leave", () => setDragging(false)));
      unlisteners.push(listen<any>("tauri://drag-drop", async (event) => {
        setDragging(false);
        const paths = normalizeDropPaths(event.payload);
        if (paths.length > 0) {
          try {
            const selected = await selectedFilesFromPaths(paths);
            appendDedupedFiles(selected);
          } catch (err) {
            console.error("Failed to process dropped files:", err);
          }
        }
      }));
    }

    setupListeners();

    return () => {
      unlisteners.forEach((u) => u.then((f) => f()));
    };
  }, [files, onFiles]);

  return (
    <div
      className={`relative flex h-full min-h-[500px] w-full flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
        dragging ? "bg-accent/5 scale-[0.98]" : ""
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleDropFiles(e.dataTransfer);
      }}
    >
      {/* Selection Grid Bar */}
      <div className="absolute bottom-8 z-20 grid grid-cols-3 gap-2 rounded-[22px] border border-border/40 bg-bg-surface/80 p-2 backdrop-blur-md shadow-lg">
        <button className="flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-bg-elevated hover:text-accent" onClick={onPickFiles} title="Pick Files">
          <FileText size={20} strokeWidth={2.5} />
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-bg-elevated hover:text-accent" onClick={onPickFolder} title="Pick Folder">
          <Folder size={20} strokeWidth={2.5} />
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-bg-elevated hover:text-accent" onClick={onClipboard} title="Send Text">
          <List size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Radar Background */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full">
        <div className="absolute left-1/2 top-1/2 h-[1px] w-[1px]">
          <div className="radar-pulse absolute h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20" />
          <div className="radar-pulse absolute h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" style={{ animationDelay: "1s" }} />
          <div className="radar-scan absolute h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </div>

      {/* Central Content */}
      <div className="relative z-10 flex w-full flex-col items-center gap-6 px-12 text-center">
        {(files.length > 0 || dragging) ? (
          <div className="flex w-full flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between px-2">
              <div className="text-left">
                <h4 className="text-xl font-bold text-text-primary">
                  {dragging ? "Ready to Share" : "Selection"}
                </h4>
                <p className="text-xs font-medium text-text-muted">
                  {dragging ? "Drop your files here" : `${files.length} items • ${formatSize(totalSize)}`}
                </p>
              </div>
              {!dragging && (
                <div className="flex gap-2">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated hover:bg-bg-surface transition-colors border border-border/40" onClick={onPickFiles} title="Add Files">
                    <span className="text-lg">+</span>
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated hover:bg-bg-surface transition-colors border border-border/40" onClick={onRemoveAll} title="Clear All">
                    <span className="text-lg">×</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className={`flex flex-col gap-2 max-h-[320px] min-h-[100px] overflow-y-auto p-1 scrollbar-none rounded-2xl transition-all ${dragging ? "border-2 border-dashed border-accent/40 bg-accent/5" : ""}`}>
              {files.length > 0 ? (
                files.map((f) => (
                  <div key={f.id} className="group flex items-center gap-4 rounded-2xl border border-border/40 bg-bg-surface/60 p-3 backdrop-blur-md transition-all hover:border-accent/40 hover:bg-bg-elevated/80">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg-elevated border border-border/40">
                      {f.previewUrl ? (
                        <img src={f.previewUrl} className="h-full w-full rounded-lg object-cover" alt="" />
                      ) : (
                        <FileText size={20} className="text-accent" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="truncate text-sm font-bold text-text-primary">{f.file.name}</p>
                      <p className="text-[10px] font-medium text-text-muted">{formatSize(f.file.size)}</p>
                    </div>
                    <button
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-bg-elevated/70 text-text-secondary transition hover:border-error/40 hover:text-error"
                      onClick={() => onRemoveFile(f.id)}
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : dragging && (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-accent/60">
                  <List size={40} strokeWidth={1.5} className="animate-bounce" />
                  <p className="mt-2 text-sm font-bold uppercase tracking-widest">Drop Zone</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="group relative h-32 w-32 cursor-pointer transition-transform hover:scale-110" onClick={onPickFiles}>
              <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl transition-opacity group-hover:opacity-40" />
              <img src={logo} alt="LocalSlack" className="relative h-full w-full rounded-full object-cover shadow-2xl" />
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-bold text-text-primary">Discovery Mode</h3>
              <p className="text-sm font-medium text-text-muted">Drop files or click to browse</p>
            </div>
          </>
        )}
      </div>

      {/* Devices in Orbit */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {devices.map((device, index) => {
          const angle = (index / devices.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 200;
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
              <div className={`grid h-16 w-16 place-items-center rounded-2xl border-2 transition-all ${
                active ? "border-accent bg-accent/15 shadow-cute" : "border-border/40 bg-bg-surface backdrop-blur-sm"
              }`}>
                <span className="text-3xl">{device.emoji || "💻"}</span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                active ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary"
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
