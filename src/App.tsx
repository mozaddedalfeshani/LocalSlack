import { useDevices } from "./hooks/useDevices";
import { useFavorites } from "./hooks/useFavorites";
import { useSettings } from "./hooks/useSettings";
import { useTransfer } from "./hooks/useTransfer";
import { useUiStore } from "./store/uiStore";
import { ClipboardReceive } from "./components/clipboard/ClipboardReceive";
import { ClipboardSend } from "./components/clipboard/ClipboardSend";
import { HistoryList } from "./components/history/HistoryList";
import { MainLayout } from "./components/layout/MainLayout";
import { ReceiveHome } from "./components/receive/ReceiveHome";
import { SendHome } from "./components/send/SendHome";
import { SettingsPage } from "./components/settings/SettingsPage";
import { ReceiveDialog } from "./components/transfer/ReceiveDialog";
import { ReceivingFilesDialog } from "./components/transfer/ReceivingFilesDialog";

export default function App() {
  const devices = useDevices();
  const transfer = useTransfer();
  const settings = useSettings();
  const favorites = useFavorites();
  const ui = useUiStore();
  const toggleFavorite = async (device: typeof devices.devices[number]) => {
    const isFavorite = !device.isFavorite;
    if (isFavorite) await favorites.add(device);
    else await favorites.remove(device.id);

    const update = (item: typeof device) => item.id === device.id ? { ...item, isFavorite } : item;
    devices.setDevices(devices.devices.map(update));
    if (devices.selectedDevice?.id === device.id) devices.selectDevice(update(devices.selectedDevice));
  };
  const setQuickSaveMode = (quickSaveMode: typeof settings.settings.quickSaveMode) => {
    void settings.save({
      ...settings.settings,
      quickSaveMode,
      quickSave: quickSaveMode === "on"
    });
  };
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
    <HistoryList />
  ) : ui.view === "settings" ? (
    <SettingsPage />
  ) : ui.view === "clipboard" ? (
    <ClipboardSend selectedDevice={devices.selectedDevice} />
  ) : (
    <SendHome
      devices={devices.devices}
      selectedDevice={devices.selectedDevice}
      loading={devices.loading}
      error={devices.error}
      files={transfer.files}
      progress={transfer.progress}
      transferError={transfer.error}
      onSelect={devices.selectDevice}
      onToggleFavorite={toggleFavorite}
      onRefresh={devices.refresh}
      onFiles={transfer.addFiles}
      onPickFiles={() => transfer.pick("files")}
      onPickFolder={() => transfer.pick("folder")}
      onClearFiles={transfer.clearFiles}
      onRemoveFile={transfer.removeFile}
      onSend={() => devices.selectedDevice && transfer.send(devices.selectedDevice)}
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
        onAccept={transfer.acceptIncoming}
        onReject={transfer.rejectIncoming}
      />
      <ReceivingFilesDialog
        transfer={transfer.receiving}
        progress={transfer.progress}
        onDone={transfer.dismissReceiving}
      />
      {ui.toast && <div className="fixed bottom-5 right-5 rounded-md bg-bg-elevated px-4 py-3 shadow-panel">{ui.toast}</div>}
    </>
  );
}
