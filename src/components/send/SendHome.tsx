import { Clipboard, FileText, Folder, List } from "lucide-react";
import type { DeviceInfo, SelectedFile, TransferProgress as Progress } from "../../types";
import { DeviceCard } from "../devices/DeviceCard";
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
  onToggleFavorite: (device: DeviceInfo) => void;
  onFiles: (files: SelectedFile[]) => void;
  onRemoveFile: (id: string) => void;
  onSend: () => void;
  onCancel: (sessionId: string) => void;
  onClipboard: () => void;
}

export function SendHome(props: Props) {
  return (
    <section className="mx-auto max-w-3xl py-10">
      <h2 className="mb-4 text-lg font-bold text-[#dce8e4]">Selection</h2>
      <div className="mb-7 grid grid-cols-4 gap-3">
        <button className="selection-tile" type="button">
          <FileText size={30} strokeWidth={2.8} />
          <span>File</span>
        </button>
        <button className="selection-tile" type="button">
          <Folder size={31} strokeWidth={2.8} />
          <span>Folder</span>
        </button>
        <button className="selection-tile" type="button" onClick={props.onClipboard}>
          <List size={31} strokeWidth={2.8} />
          <span>Text</span>
        </button>
        <button className="selection-tile" type="button" onClick={props.onClipboard}>
          <Clipboard size={31} strokeWidth={2.8} />
          <span>Paste</span>
        </button>
      </div>

      <div className="send-drop-panel mb-7">
        <FileDropZone
          files={props.files}
          selectedDevice={props.selectedDevice}
          error={props.transferError}
          onFiles={props.onFiles}
          onRemove={props.onRemoveFile}
          onSend={props.onSend}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#dce8e4]">Available devices</h2>
        <p className="text-sm text-[#8fa59f]">{props.devices.length} found</p>
      </div>
      <div className="rounded-lg bg-[#122620] p-5">
        {props.loading && <div className="device-skeleton" />}
        {props.error && <p className="text-sm text-error">{props.error}</p>}
        {!props.loading && !props.error && props.devices.length === 0 && (
          <div className="py-8 text-center">
            <p className="font-bold text-[#dce8e4]">No devices found</p>
            <p className="mt-2 text-sm text-[#8fa59f]">Open SwiftShare on another device in the same Wi-Fi network.</p>
          </div>
        )}
        <div className="space-y-3">
          {props.devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              selected={props.selectedDevice?.id === device.id}
              onSelect={props.onSelect}
              onToggleFavorite={props.onToggleFavorite}
            />
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-[#8e9d98]">Select files, choose one device, then send. Use Group Share for multiple devices.</p>
      <TransferProgress items={props.progress} onCancel={props.onCancel} />
    </section>
  );
}
