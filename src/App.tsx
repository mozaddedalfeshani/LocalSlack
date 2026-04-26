import { useEffect } from "react";
import { useDevices } from "./hooks/useDevices";
import { useFavorites } from "./hooks/useFavorites";
import { useSettings } from "./hooks/useSettings";
import { useTransfer } from "./hooks/useTransfer";
import { useUiStore } from "./store/uiStore";
import { ClipboardReceive } from "./components/clipboard/ClipboardReceive";
import { ClipboardSend } from "./components/clipboard/ClipboardSend";
import { HistoryList } from "./components/history/HistoryList";
import { MainLayout } from "./components/layout/MainLayout";
import { SettingsMenu } from "./components/settings/SettingsMenu";
import { FileDropZone } from "./components/transfer/FileDropZone";
import { TransferProgress } from "./components/transfer/TransferProgress";

export default function App() {
  const devices = useDevices();
  const transfer = useTransfer();
  const settings = useSettings();
  const favorites = useFavorites();
  const ui = useUiStore();
  useEffect(() => {
    if (!devices.selectedDevice && devices.devices[0]) devices.selectDevice(devices.devices[0]);
  }, [devices.devices, devices.selectedDevice]);
  const toggleFavorite = async (device: typeof devices.devices[number]) => {
    if (device.isFavorite) await favorites.remove(device.id);
    else await favorites.add(device);
    devices.setDevices(await favorites.list().then(() => devices.devices.map((item) => item.id === device.id ? { ...item, isFavorite: !item.isFavorite } : item)));
  };
  const content = ui.view === "history" ? (
    <HistoryList />
  ) : ui.view === "clipboard" ? (
    <ClipboardSend selectedDevice={devices.selectedDevice} />
  ) : (
    <>
      <FileDropZone files={transfer.files} selectedDevice={devices.selectedDevice} error={transfer.error} onFiles={transfer.addFiles} onRemove={transfer.removeFile} onSend={() => devices.selectedDevice && transfer.send(devices.selectedDevice)} />
      <TransferProgress items={transfer.progress} onCancel={(id) => transfer.cancel(id)} />
    </>
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
        onSettings={() => ui.setSettingsOpen(true)}
      >
        {content}
      </MainLayout>
      <SettingsMenu open={ui.settingsOpen} onClose={() => ui.setSettingsOpen(false)} />
      <ClipboardReceive />
      {ui.toast && <div className="fixed bottom-5 right-5 rounded-md bg-bg-elevated px-4 py-3 shadow-panel">{ui.toast}</div>}
    </>
  );
}
