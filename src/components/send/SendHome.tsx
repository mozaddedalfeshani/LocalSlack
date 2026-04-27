import type {
  DeviceInfo,
  SelectedFile,
  TransferProgress as Progress,
} from "../../types";
import { DeviceList } from "../devices/DeviceList";
import { FileDropZone } from "../transfer/FileDropZone";
import { TransferProgress } from "../transfer/TransferProgress";
import { RefreshCw, Clipboard, Trash2 } from "lucide-react";

interface Props {
  devices: DeviceInfo[];
  selectedDevice?: DeviceInfo;
  loading?: boolean;
  error?: string;
  files: SelectedFile[];
  progress: Progress[];
  transferError?: string;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onRefresh: () => void;
  onFiles: (files: SelectedFile[]) => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onClearFiles: () => void;
  onRemoveFile: (id: string) => void;
  onSend: () => void;
  onCancel: (sessionId: string) => void;
  onClipboard: () => void;
}

export function SendHome(props: Props) {
  return (
    <section className="flex h-full w-full flex-col gap-6 overflow-y-auto px-4 py-4">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <FileDropZone
            files={props.files}
            selectedDevice={props.selectedDevice}
            error={props.transferError}
            onFiles={props.onFiles}
            onPickFiles={props.onPickFiles}
            onPickFolder={props.onPickFolder}
            onRemove={props.onRemoveFile}
            onSend={props.onSend}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="secondary-button inline-flex items-center gap-2"
              onClick={props.onClipboard}
            >
              <Clipboard size={18} />
              Text
            </button>
            {props.files.length > 0 && (
              <button
                type="button"
                className="secondary-button inline-flex items-center gap-2"
                onClick={props.onClearFiles}
              >
                <Trash2 size={18} />
                Clear
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Nearby</h2>
              <p className="text-xs text-text-muted">Select one device before sending.</p>
            </div>
            <button
              type="button"
              className="plain-icon-button hover:text-accent"
              title="Refresh"
              aria-label="Refresh devices"
              onClick={props.onRefresh}
            >
              <RefreshCw size={20} className={props.loading ? "animate-spin" : ""} />
            </button>
          </div>

          <DeviceList
            devices={props.devices}
            selected={props.selectedDevice}
            loading={props.loading}
            error={props.error}
            onSelect={props.onSelect}
            onToggleFavorite={props.onToggleFavorite}
          />
        </aside>
      </div>

      {(props.transferError || props.error) && (
        <p className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
          {props.transferError || props.error}
        </p>
      )}

      {props.progress.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary">Active Transfers</h2>
          <TransferProgress items={props.progress} onCancel={props.onCancel} />
        </div>
      )}
    </section>
  );
}
