import type {
  DeviceInfo,
  SelectedFile,
  TransferProgress as Progress,
} from "../../types";
import { TransferProgress } from "../transfer/TransferProgress";
import { DiscoveryRadar } from "./DiscoveryRadar";
import { FilePreview } from "../transfer/FilePreview";
import { ImagePreview } from "../transfer/ImagePreview";
import { useTranslation } from "react-i18next";
import { RefreshCw, MousePointerClick, Heart, Settings } from "lucide-react";

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
  onPickFiles: () => void;
  onPickFolder: () => void;
  onRemoveFile: (id: string) => void;
  onSend: () => void;
  onCancel: (sessionId: string) => void;
  onClipboard: () => void;
}

export function SendHome(props: Props) {
  const { t } = useTranslation();
  const canSend = Boolean(props.selectedDevice && props.files.length);

  return (
    <section className="flex w-full flex-col gap-8 py-4">
      {/* Interactive Radar Discovery Area with Integrated Grid View */}
      <DiscoveryRadar
        devices={props.devices}
        selectedDevice={props.selectedDevice}
        files={props.files}
        onSelect={props.onSelect}
        onFiles={props.onFiles}
        onPickFiles={props.onPickFiles}
        onPickFolder={props.onPickFolder}
        onClipboard={props.onClipboard}
        onRemoveAll={() => props.files.forEach(f => props.onRemoveFile(f.id))}
      />

      {/* Hero Send Action */}
      {props.files.length > 0 && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            type="button"
            className="primary-button h-14 w-full max-w-md rounded-2xl text-lg shadow-2xl shadow-accent/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            disabled={!canSend}
            onClick={props.onSend}
          >
            {props.selectedDevice 
              ? t("transfer.send", { device: props.selectedDevice.name }) 
              : "Select a device to send"}
          </button>
        </div>
      )}

      {/* Nearby Devices Section (Mockup Style) */}
      <div className="mt-4 space-y-6 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <div className="flex items-center justify-between border-b border-border/10 pb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-text-primary">আশেপাশের ডিভাইসসমূহ</h3>
            <span className="text-xs font-medium text-text-muted uppercase tracking-widest">Nearby</span>
          </div>
          <div className="flex items-center gap-4 text-text-secondary">
            <button className="plain-icon-button hover:text-accent transition-colors" title="Refresh">
              <RefreshCw size={20} strokeWidth={2.5} />
            </button>
            <button className="plain-icon-button hover:text-accent transition-colors" title="Select All">
              <MousePointerClick size={20} strokeWidth={2.5} />
            </button>
            <button className="plain-icon-button hover:text-accent transition-colors" title="Favorites">
              <Heart size={20} strokeWidth={2.5} />
            </button>
            <button className="plain-icon-button hover:text-accent transition-colors" title="Settings">
              <Settings size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Traditional Device List (If needed alongside radar) */}
        <div className="grid gap-4">
          {props.devices.length > 0 ? (
            props.devices.map((device) => (
              <div 
                key={device.id} 
                onClick={() => props.onSelect(device)}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all cursor-pointer ${
                  props.selectedDevice?.id === device.id 
                    ? "border-accent bg-accent/10" 
                    : "border-border/40 bg-bg-surface/50 hover:bg-bg-elevated"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-bg-elevated border border-border/40 text-2xl">
                    {device.emoji || "💻"}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{device.name}</p>
                    <p className="text-xs text-text-muted">{device.id}</p>
                  </div>
                </div>
                {props.selectedDevice?.id === device.id && (
                  <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent))]" />
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-border/20 bg-bg-surface/30 p-12 text-center">
              <p className="text-sm font-medium text-text-muted italic">Scanning for nearby devices...</p>
            </div>
          )}
        </div>

        {/* Troubleshooting Link */}
        <div className="flex flex-col items-center gap-4 pt-8">
          <button className="text-sm font-bold text-accent/80 hover:text-accent transition-colors flex items-center gap-2">
            <span>সমস্যা সমাধান</span>
            <span className="text-xs opacity-50">• Troubleshooting</span>
          </button>
          <p className="max-w-xs text-center text-[10px] leading-relaxed text-text-muted">
            অনুগ্রহ করে নিশ্চিত করুন যে পছন্দসই লক্ষ্যটিও একই ওয়াইফাই নেটওয়ার্কে রয়েছে।
            <br />
            <span className="opacity-60 italic">Please ensure that the target device is on the same Wi-Fi network.</span>
          </p>
        </div>
      </div>

      {/* Progress and Feedback */}
      {(props.transferError || props.error) && (
        <p className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error mx-4">
          {props.transferError || props.error}
        </p>
      )}

      {props.progress.length > 0 && (
        <div className="space-y-4 px-4">
          <h2 className="text-lg font-bold text-text-primary">Active Transfers</h2>
          <TransferProgress items={props.progress} onCancel={props.onCancel} />
        </div>
      )}
    </section>
  );
}
