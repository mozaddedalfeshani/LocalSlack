import { Building2, Check, Send, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { DeviceInfo, SelectedFile, TransferProgress as Progress } from "../../types";
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
    [props.devices, selectedIds]
  );
  const canSend = props.files.length > 0 && selectedDevices.length > 0;

  const toggleDevice = (device: DeviceInfo) => {
    setSelectedIds((current) =>
      current.includes(device.id)
        ? current.filter((id) => id !== device.id)
        : [...current, device.id]
    );
    props.onSelect(device);
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header>
        <p className="text-sm font-semibold text-[#7fd8c9]">Group Share</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-[#eef8f5]">Send the same files to multiple devices</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#8ea39d]">Select files once, select every receiver, then send.</p>
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
            <h3 className="text-lg font-bold text-[#effaf7]">Available devices</h3>
            <p className="text-sm text-[#8fa59f]">Choose multiple devices.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#173028] px-3 py-1 text-sm font-bold text-[#83d8cb]">
            <Users size={16} />
            {selectedDevices.length} selected
          </div>
        </div>
        {props.loading && <div className="device-skeleton" />}
        {props.error && <p className="text-sm text-error">{props.error}</p>}
        {!props.loading && !props.error && props.devices.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#315048] p-6 text-center">
            <Building2 className="mx-auto mb-3 text-[#55736b]" size={34} />
            <p className="font-bold text-[#dbe9e4]">No devices nearby</p>
            <p className="mt-1 text-sm text-[#8fa59f]">Ask teammates to open LocalSlack on the same Wi-Fi.</p>
          </div>
        )}
        <div className="space-y-2">
          {props.devices.map((device) => {
            const selected = selectedIds.includes(device.id);
            return (
              <button key={device.id} type="button" className={`recipient-row ${selected ? "selected" : ""}`} onClick={() => toggleDevice(device)}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#29483f] text-xl">{device.emoji || "💻"}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold text-[#edf7f4]">{device.name}</span>
                  <span className="block truncate text-xs text-[#8fa59f]">{device.ip}:{device.port}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-[#80d8ca] bg-[#80d8ca] text-[#08201a]" : "border-[#466b61]"}`}>
                  {selected && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="office-panel flex items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-lg font-bold text-[#effaf7]">Ready</h3>
          <p className="mt-1 text-sm text-[#8fa59f]">{props.files.length} files selected · {selectedDevices.length} devices selected</p>
        </div>
        <button
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#80d8ca] px-6 font-extrabold text-[#08201a] transition hover:bg-[#6ac4b6] disabled:opacity-40"
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
