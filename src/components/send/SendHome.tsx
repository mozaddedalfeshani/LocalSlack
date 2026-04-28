import { Clipboard, File, FolderOpen, RefreshCw, Star, X } from "lucide-react";
import type { DeviceInfo, SelectedFile, TransferProgress as Progress } from "../../types";
import { formatBytes } from "../../utils/formatUtils";
import { sortDevices } from "../../utils/deviceUtils";
import { DeviceAvatar } from "../devices/DeviceAvatar";

interface Props {
  devices: DeviceInfo[];
  selectedDevice?: DeviceInfo;
  loading?: boolean;
  error?: string;
  files: SelectedFile[];
  progress: Progress[];
  transferError?: string;
  transferring?: boolean;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onRefresh: () => void;
  onFiles: (files: SelectedFile[]) => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClearFiles: () => void;
  onRemoveFile: (id: string) => void;
  onSend: (device: DeviceInfo) => void;
  onCancel: (sessionId: string) => void;
  onClipboard: () => void;
}

export function SendHome(props: Props) {
  const hasFiles = props.files.length > 0;
  const totalSize = props.files.reduce((sum, f) => sum + f.file.size, 0);
  const sorted = sortDevices(props.devices);

  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto">
      {/* File selection area */}
      <section className="px-5 pt-5 pb-4">
        {!hasFiles ? (
          <div>
            <p className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">Select files</p>
            <div className="grid grid-cols-3 gap-3">
              <BigButton icon={<File size={28} />} label="Files" onClick={props.onPickFiles} />
              <BigButton icon={<FolderOpen size={28} />} label="Folder" onClick={props.onPickFolder} />
              <BigButton icon={<Clipboard size={28} />} label="Text" onClick={props.onClipboard} />
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border/50 bg-bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">Selected files</p>
                <p className="text-sm text-text-muted">
                  {props.files.length} file{props.files.length !== 1 ? "s" : ""} · {formatBytes(totalSize)}
                </p>
              </div>
              <button
                type="button"
                className="plain-icon-button"
                onClick={props.onClearFiles}
                title="Clear all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {props.files.map((f) => (
                <div key={f.id} className="relative shrink-0">
                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt={f.file.name}
                      className="h-14 w-14 rounded-md object-cover border border-border/40"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-md border border-border/40 bg-bg-elevated text-text-muted">
                      <File size={22} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => props.onRemoveFile(f.id)}
                    className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-error text-white text-[10px] leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add more */}
            <div className="mt-3 flex gap-2">
              <button type="button" className="secondary-button gap-1.5 text-xs" onClick={props.onPickFiles}>
                <File size={14} /> Add files
              </button>
              <button type="button" className="secondary-button gap-1.5 text-xs" onClick={props.onPickFolder}>
                <FolderOpen size={14} /> Add folder
              </button>
            </div>
          </div>
        )}

        {props.transferError && (
          <p className="mt-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            {props.transferError}
          </p>
        )}
      </section>

      {/* Divider + device list */}
      <section className="flex-1 px-5 pb-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            {hasFiles ? "Tap a device to send" : "Nearby devices"}
          </p>
          <button
            type="button"
            className="plain-icon-button"
            title="Refresh"
            onClick={props.onRefresh}
          >
            <RefreshCw size={17} className={props.loading ? "animate-spin" : ""} />
          </button>
        </div>

        {props.loading && props.devices.length === 0 && (
          <p className="text-sm text-text-muted">Searching for devices…</p>
        )}
        {!props.loading && props.devices.length === 0 && (
          <p className="text-sm text-text-muted">No devices found on this network.</p>
        )}

        <div className="space-y-2">
          {sorted.map((device) => {
            const devProgress = props.progress.filter((p) => {
              // Match by session that belongs to this device (can't know for sure, show all progress when device is selected)
              return props.selectedDevice?.id === device.id;
            });
            const totalBytes = devProgress.reduce((s, p) => s + p.totalBytes, 0);
            const doneBytes = devProgress.reduce((s, p) => s + p.bytesTransferred, 0);
            const pct = totalBytes > 0 ? Math.round((doneBytes / totalBytes) * 100) : undefined;
            const isSending = props.selectedDevice?.id === device.id && props.progress.length > 0;

            return (
              <DeviceListTile
                key={device.id}
                device={device}
                progress={isSending ? pct : undefined}
                hasFiles={hasFiles}
                onTap={() => {
                  props.onSelect(device);
                  if (hasFiles) props.onSend(device);
                }}
                onToggleFavorite={() => props.onToggleFavorite(device)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BigButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-bg-surface py-6 text-text-secondary transition hover:border-accent hover:bg-bg-elevated hover:text-text-primary active:scale-95"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function DeviceListTile({
  device,
  progress,
  hasFiles,
  onTap,
  onToggleFavorite,
}: {
  device: DeviceInfo;
  progress?: number;
  hasFiles: boolean;
  onTap: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTap(); }}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-bg-surface p-3 transition select-none ${
        hasFiles
          ? "border-border/40 hover:border-accent hover:bg-bg-elevated"
          : "border-border/30 hover:border-border hover:bg-bg-elevated"
      }`}
    >
      <DeviceAvatar device={device} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-text-primary">{device.name}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
        </div>
        <p className="truncate text-xs text-text-muted">{device.ip}</p>
        {progress !== undefined && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={device.isFavorite ? "Remove favorite" : "Add favorite"}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="shrink-0 rounded-md p-1 text-text-secondary transition hover:bg-bg-elevated hover:text-accent"
      >
        <Star size={17} fill={device.isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
