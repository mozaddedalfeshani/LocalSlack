import { Clipboard, FileText, Folder, Heart, HelpCircle, List, RefreshCw, RotateCw, Settings } from "lucide-react";
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
  onSettings: () => void;
}

export function SendHome(props: Props) {
  return (
    <section className="mx-auto max-w-[760px] py-10">
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

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#dce8e4]">Nearby devices</h2>
        <div className="flex items-center gap-5 text-[#e1eee9]">
          <button className="plain-icon-button" type="button" aria-label="Refresh"><RefreshCw size={22} strokeWidth={3} /></button>
          <button className="plain-icon-button" type="button" aria-label="Scan"><RotateCw size={22} strokeWidth={3} /></button>
          <button className="plain-icon-button" type="button" aria-label="Favorites"><Heart size={23} strokeWidth={3} fill="currentColor" /></button>
          <button className="plain-icon-button" type="button" aria-label="Settings" onClick={props.onSettings}><Settings size={22} strokeWidth={3} /></button>
        </div>
      </div>

      <div className="mb-8 rounded-lg bg-[#122620] p-5">
        {props.loading && <div className="device-skeleton" />}
        {props.error && <p className="text-sm text-error">{props.error}</p>}
        {!props.loading && !props.error && props.devices.length === 0 && (
          <div className="device-skeleton" />
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

      <div className="mb-7 text-center">
        <button className="text-sm font-bold text-[#7bd3c5]" type="button">
          Troubleshoot
        </button>
        <p className="mt-8 text-sm text-[#8e9d98]">Please ensure that the desired target is also on the same Wi-Fi network.</p>
      </div>

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
      <TransferProgress items={props.progress} onCancel={props.onCancel} />
      <button className="fixed bottom-5 right-5 text-[#9bb0aa]" type="button" aria-label="Help">
        <HelpCircle size={24} />
      </button>
    </section>
  );
}
