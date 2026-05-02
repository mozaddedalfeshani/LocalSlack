import { Building2, Check, Send, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  DeviceInfo,
  SelectedFile,
  TransferProgress as Progress,
} from "../../types";
import { FileDropZone } from "../transfer/FileDropZone";
import { TransferProgress } from "../transfer/TransferProgress";

interface Props {
  devices: DeviceInfo[];
  selectedDevice?: DeviceInfo;
  loading?: boolean;
  error?: string;
  files: SelectedFile[];
  progress: Progress[];
  transferError?: string;
  onSelect: (device: DeviceInfo) => void;
  onFiles: (files: SelectedFile[]) => void;
  onRemoveFile: (id: string) => void;
  onSend: () => void;
  onCancel: (sessionId: string) => void;
}

export function GroupShare(props: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedDevices = useMemo(
    () => props.devices.filter((device) => selectedIds.includes(device.id)),
    [props.devices, selectedIds],
  );
  const canSend = props.files.length > 0 && selectedDevices.length > 0;

  const toggleDevice = (device: DeviceInfo) => {
    setSelectedIds((current) =>
      current.includes(device.id)
        ? current.filter((id) => id !== device.id)
        : [...current, device.id],
    );
    props.onSelect(device);
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header>
        <p className="text-sm font-semibold text-accent">Group Share</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          Send the same files to multiple devices
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Select files once, select every receiver, then send.
        </p>
      </header>

      <div className="send-drop-panel">
        <FileDropZone
          files={props.files}
          selectedDevice={props.selectedDevice}
          error={props.transferError}
          onFiles={props.onFiles}
          onRemove={props.onRemoveFile}
          onSend={props.onSend}
        />
      </div>

      <section className="office-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Available devices
            </h3>
            <p className="text-sm text-text-muted">Choose multiple devices.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
            <Users size={16} />
            {selectedDevices.length} selected
          </div>
        </div>
        {props.loading && <div className="device-skeleton" />}
        {props.error && <p className="text-sm text-error">{props.error}</p>}
        {!props.loading && !props.error && props.devices.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Building2 className="mx-auto mb-3 text-text-muted" size={34} />
            <p className="font-bold text-text-primary">No devices nearby</p>
            <p className="mt-1 text-sm text-text-muted">
              Ask teammates to open LocalSlack on the same Wi-Fi.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {props.devices.map((device) => {
            const selected = selectedIds.includes(device.id);
            return (
              <button
                key={device.id}
                type="button"
                className={`recipient-row ${selected ? "selected" : ""}`}
                onClick={() => toggleDevice(device)}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-xl">
                  {device.emoji || "💻"}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold text-text-primary">
                    {device.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {device.ip}:{device.port}
                  </span>
                </span>
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-accent bg-accent text-white" : "border-border"}`}
                >
                  {selected && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="office-panel flex items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Ready</h3>
          <p className="mt-1 text-sm text-text-muted">
            {props.files.length} files selected · {selectedDevices.length}{" "}
            devices selected
          </p>
        </div>
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-extrabold text-white shadow-cute transition hover:bg-accent-hover disabled:opacity-40"
          type="button"
          disabled={!canSend}
          onClick={props.onSend}
        >
          <Send size={20} strokeWidth={3} />
          Send to selected
        </button>
      </section>

      <TransferProgress items={props.progress} onCancel={props.onCancel} />
    </section>
  );
}
