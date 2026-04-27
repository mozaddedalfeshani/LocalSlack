import type { DeviceInfo, SelectedFile, TransferProgress as Progress } from "../../types";
import { TransferProgress } from "../transfer/TransferProgress";
import { DiscoveryRadar } from "./DiscoveryRadar";
import { FilePreview } from "../transfer/FilePreview";
import { ImagePreview } from "../transfer/ImagePreview";
import { useTranslation } from "react-i18next";

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
      {/* Interactive Radar Discovery Area */}
      <DiscoveryRadar
        devices={props.devices}
        selectedDevice={props.selectedDevice}
        onSelect={props.onSelect}
        onFiles={props.onFiles}
        onPickFiles={props.onPickFiles}
        onPickFolder={props.onPickFolder}
        onClipboard={props.onClipboard}
      />

      {/* Selected Files and Actions */}
      {props.files.length > 0 && (
        <div className="space-y-6 rounded-3xl border border-border/40 bg-bg-surface/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Ready to Send</h2>
            <button
              type="button"
              className="primary-button h-11 px-8 text-base shadow-lg shadow-accent/20"
              disabled={!canSend}
              onClick={props.onSend}
            >
              {props.selectedDevice ? t("transfer.send", { device: props.selectedDevice.name }) : "Select a device"}
            </button>
          </div>

          <ImagePreview files={props.files} />
          <FilePreview files={props.files} onRemove={props.onRemoveFile} />
        </div>
      )}

      {/* Progress and Feedback */}
      {(props.transferError || props.error) && (
        <p className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {props.transferError || props.error}
        </p>
      )}

      {props.progress.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary">Active Transfers</h2>
          <TransferProgress items={props.progress} onCancel={props.onCancel} />
        </div>
      )}

      {!props.loading && !props.error && props.devices.length === 0 && (
        <p className="text-center text-sm text-text-muted">
          Looking for nearby devices... Make sure SwiftShare is open on other devices.
        </p>
      )}
    </section>
  );
}
