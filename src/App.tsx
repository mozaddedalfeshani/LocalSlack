import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { useDevices } from "./hooks/useDevices";
import { useFavorites } from "./hooks/useFavorites";
import { useSettings } from "./hooks/useSettings";
import { useTransfer } from "./hooks/useTransfer";
import { useUiStore } from "./store/uiStore";
import { ClipboardReceive } from "./components/clipboard/ClipboardReceive";
import { ClipboardSend } from "./components/clipboard/ClipboardSend";
import { HistoryList } from "./components/history/HistoryList";
import { MainLayout } from "./components/layout/MainLayout";
import { StartupNetworkDialog } from "./components/network/StartupNetworkDialog";
import { ReceiveHome } from "./components/receive/ReceiveHome";
import { SendHome } from "./components/send/SendHome";
import { SettingsPage } from "./components/settings/SettingsPage";
import { ReceiveDialog } from "./components/transfer/ReceiveDialog";
import { ProgressPage } from "./components/transfer/ProgressPage";
import type { DeviceInfo, NetworkStatus } from "./types";

export default function App() {
  const devices = useDevices();
  const transfer = useTransfer();
  const settings = useSettings();
  const favorites = useFavorites();
  const ui = useUiStore();
  const [networkDialogOpen, setNetworkDialogOpen] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>();
  const [networkStatusLoading, setNetworkStatusLoading] = useState(false);
  const [networkStatusError, setNetworkStatusError] = useState<string>();
  useEffect(() => {
    void invoke("set_receive_mode_active", { active: !settings.settings.hidden });
  }, [settings.settings.hidden]);

  const refreshNetworkStatus = useCallback(async () => {
    setNetworkStatusLoading(true);
    setNetworkStatusError(undefined);
    try {
      setNetworkStatus(await invoke<NetworkStatus>("get_network_status"));
    } catch (error) {
      setNetworkStatusError(String(error));
    } finally {
      setNetworkStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshNetworkStatus();
    const timeout = window.setTimeout(() => void refreshNetworkStatus(), 1500);
    return () => window.clearTimeout(timeout);
  }, [refreshNetworkStatus, settings.settings.hidden]);

  const toggleFavorite = async (device: typeof devices.devices[number]) => {
    const isFavorite = !device.isFavorite;
    if (isFavorite) await favorites.add(device);
    else await favorites.remove(device.id);

    const update = (item: typeof device) => item.id === device.id ? { ...item, isFavorite } : item;
    devices.setDevices(devices.devices.map(update));
    if (devices.selectedDevice?.id === device.id) devices.selectDevice(update(devices.selectedDevice));
  };

  const setQuickSaveMode = useCallback((quickSaveMode: typeof settings.settings.quickSaveMode) => {
    void settings.save({
      ...settings.settings,
      quickSaveMode,
      quickSave: quickSaveMode === "on"
    });
  }, [settings]);

  const handleAcceptIncoming = useCallback(() => {
    void transfer.acceptIncoming();
  }, [transfer.acceptIncoming]);

  const handleRejectIncoming = useCallback(() => {
    void transfer.rejectIncoming();
  }, [transfer.rejectIncoming]);

  const handleSend = useCallback((device: DeviceInfo) => {
    devices.selectDevice(device);
    void transfer.send(device);
  }, [devices, transfer]);

  const isTransferring = transfer.outgoing != null || transfer.receiving != null || transfer.progress.length > 0;

  const content = ui.view === "receive" ? (
    <ReceiveHome
      deviceName={settings.settings.deviceName}
      emoji={settings.settings.deviceEmoji}
      status={settings.settings.hidden ? "Hidden" : "Online"}
      quickSaveMode={settings.settings.quickSave ? "on" : settings.settings.quickSaveMode}
      onQuickSaveMode={setQuickSaveMode}
      onHistory={() => ui.setView("history")}
    />
  ) : ui.view === "history" ? (
    <div className="h-full overflow-y-auto px-6 py-6"><HistoryList /></div>
  ) : ui.view === "settings" ? (
    <div className="h-full overflow-y-auto"><SettingsPage /></div>
  ) : ui.view === "clipboard" ? (
    <div className="h-full overflow-y-auto px-6 py-6"><ClipboardSend selectedDevice={devices.selectedDevice} /></div>
  ) : (
    <SendHome
      devices={devices.devices}
      selectedDevice={devices.selectedDevice}
      loading={devices.loading}
      error={devices.error}
      files={transfer.files}
      progress={transfer.progress}
      transferError={transfer.error}
      transferring={isTransferring}
      onSelect={devices.selectDevice}
      onToggleFavorite={toggleFavorite}
      onRefresh={devices.refresh}
      onFiles={transfer.addFiles}
      onPickFiles={() => transfer.pick("files")}
      onPickFolder={() => transfer.pick("folder")}
      onClearFiles={transfer.clearFiles}
      onRemoveFile={transfer.removeFile}
      onSend={handleSend}
      onCancel={(id) => transfer.cancel(id)}
      onClipboard={() => ui.setView("clipboard")}
    />
  );

  return (
    <>
      <MainLayout
        deviceName={settings.settings.deviceName}
        devices={devices.devices}
        selected={devices.selectedDevice}
        loading={devices.loading}
        error={devices.error}
        view={ui.view}
        onView={ui.setView}
        onSelect={devices.selectDevice}
        onToggleFavorite={toggleFavorite}
        onSettings={() => ui.setView("settings")}
      >
        {content}
      </MainLayout>

      <ClipboardReceive />

      <ReceiveDialog
        sender={transfer.incoming?.sender}
        files={transfer.incoming?.files ?? []}
        onAccept={handleAcceptIncoming}
        onReject={handleRejectIncoming}
      />

      {isTransferring && (
        <ProgressPage
          outgoing={transfer.outgoing}
          receiving={transfer.receiving}
          progress={transfer.progress}
          transferComplete={transfer.transferComplete}
          onCancel={(id) => transfer.cancel(id)}
          onDone={transfer.dismissReceiving}
        />
      )}

      <StartupNetworkDialog
        open={networkDialogOpen}
        status={networkStatus}
        loading={networkStatusLoading}
        error={networkStatusError}
        onRefresh={refreshNetworkStatus}
        onClose={() => setNetworkDialogOpen(false)}
      />

      {ui.toast && (
        <div className="fixed bottom-5 right-5 rounded-md bg-bg-elevated px-4 py-3 shadow-panel z-[200]">
          {ui.toast}
        </div>
      )}
    </>
  );
}
