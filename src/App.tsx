import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { ChannelShare } from "./components/channel/ChannelShare";
import { useDevices } from "./hooks/useDevices";
import { useFavorites } from "./hooks/useFavorites";
import { useSettings } from "./hooks/useSettings";
import { useTransfer } from "./hooks/useTransfer";
import { getChannel } from "./data/channels";
import { useChannelStore } from "./store/channelStore";
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
import type { ChannelEvent, ChannelEventsResponse, ClipboardPayload, DeviceInfo, NetworkStatus, SlackInfo } from "./types";
import { decodeChannelText } from "./utils/channelPayload";

const CHANNEL_SYNC_INTERVAL_MS = 3_000;

export default function App() {
  const devices = useDevices();
  const transfer = useTransfer();
  const settings = useSettings();
  const favorites = useFavorites();
  const ui = useUiStore();
  const [networkDialogOpen, setNetworkDialogOpen] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>();
  const [localDevice, setLocalDevice] = useState<DeviceInfo>();
  const [networkStatusLoading, setNetworkStatusLoading] = useState(false);
  const [networkStatusError, setNetworkStatusError] = useState<string>();
  const channels = useChannelStore((state) => state.channels);
  const setSlackInfo = useChannelStore((state) => state.setSlackInfo);
  const setChannelEvents = useChannelStore((state) => state.setEvents);
  const upsertChannelEvent = useChannelStore((state) => state.upsertEvent);

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

  useEffect(() => {
    invoke<DeviceInfo>("get_device_info")
      .then(setLocalDevice)
      .catch(() => undefined);
  }, [settings.settings.deviceName, settings.settings.deviceEmoji]);

  const refreshChannelEvents = useCallback(async () => {
    try {
      setChannelEvents(await invoke<ChannelEvent[]>("get_channel_events"));
      setSlackInfo(await invoke<SlackInfo>("get_slack_info"));
    } catch {
      // Channel sync is opportunistic; the UI can continue with local state.
    }
  }, [setChannelEvents, setSlackInfo]);

  useEffect(() => {
    void refreshChannelEvents();
  }, [refreshChannelEvents]);

  useEffect(() => {
    const sync = async () => {
      try {
        const response = await invoke<ChannelEventsResponse>("sync_channels");
        setChannelEvents(response.events);
        setSlackInfo(response.slackInfo);
      } catch {
        // Offline-only use is allowed.
      }
    };
    void sync();
    const id = window.setInterval(() => void sync(), CHANNEL_SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [devices.devices.length, setChannelEvents, setSlackInfo]);

  useEffect(() => {
    const unlisten = listen<ClipboardPayload>("clipboard-received", (event) => {
      const payload = decodeChannelText(event.payload.text);
      if (!payload) return;
      upsertChannelEvent({
        id: `live:${event.payload.sender.id}:${payload.channelId}:${payload.timestamp}:${payload.text}`,
        channelId: payload.channelId,
        kind: "text",
        authorId: payload.sender?.id ?? event.payload.sender.id,
        authorName: payload.sender?.name ?? event.payload.sender.name,
        authorEmoji: payload.sender?.emoji ?? event.payload.sender.emoji,
        authorIp: event.payload.sender.ip,
        text: payload.text,
        availableCount: 1,
        createdAt: payload.timestamp,
        updatedAt: payload.timestamp,
      });
      ui.setChannel(payload.channelId);
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, [upsertChannelEvent, ui]);

  useEffect(() => {
    const unlisten = listen<ChannelEvent>("channel-event-updated", (event) => {
      upsertChannelEvent(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, [upsertChannelEvent]);

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

  const syncChannelState = useCallback(async () => {
    const response = await invoke<ChannelEventsResponse>("sync_channels");
    setChannelEvents(response.events);
    setSlackInfo(response.slackInfo);
    return response;
  }, [setChannelEvents, setSlackInfo]);

  const createChannel = useCallback((name: string) => {
    void invoke<SlackInfo>("create_channel", { name })
      .then((info) => {
        setSlackInfo(info);
        const latest = [...info.channels].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (latest) ui.setChannel(latest.id);
      })
      .then(syncChannelState)
      .catch((error) => useUiStore.getState().showToast(String(error)));
  }, [setSlackInfo, syncChannelState, ui]);

  const renameChannel = useCallback((channelId: string, name: string) => {
    void invoke<SlackInfo>("rename_channel", { channelId, name })
      .then(setSlackInfo)
      .then(syncChannelState)
      .catch((error) => useUiStore.getState().showToast(String(error)));
  }, [setSlackInfo, syncChannelState]);

  const activeChannel = getChannel(ui.activeChannelId, channels);
  const currentLocalDevice: DeviceInfo = localDevice ?? {
    id: settings.settings.deviceId || "local-device",
    name: settings.settings.deviceName || "You",
    emoji: settings.settings.deviceEmoji,
    ip: "local",
    port: settings.settings.port,
    deviceType: "desktop",
    isFavorite: false,
    lastSeen: Math.floor(Date.now() / 1000),
  };

  const sendChannelFiles = useCallback(() => {
    if (transfer.files.length === 0) return;
    void (async () => {
      const events: ChannelEvent[] = [];
      for (const item of transfer.files) {
        const event = await invoke<ChannelEvent>("save_channel_asset_event", {
          channelId: ui.activeChannelId,
          fileName: item.file.name,
          fileSize: item.file.size,
          filePath: item.path,
          recipientCount: devices.devices.length,
        });
        events.push(event);
        upsertChannelEvent(event);
      }
      await transfer.sendToDevices(
        devices.devices,
        `# ${activeChannel.name}`,
        ui.activeChannelId,
        events.map((event) => event.assetId ?? event.id)
      );
      window.setTimeout(() => void syncChannelState().catch(() => undefined), 1000);
    })().catch(() => undefined);
  }, [activeChannel.name, devices.devices, syncChannelState, transfer, ui.activeChannelId, upsertChannelEvent]);

  const sendChannelMessage = useCallback((text: string) => {
    void invoke<ChannelEvent>("save_channel_text_event", {
      channelId: ui.activeChannelId,
      text,
    })
      .then((event) => {
        upsertChannelEvent(event);
        return syncChannelState();
      })
      .catch(() => transfer.sendTextToDevices(devices.devices, ui.activeChannelId, text, currentLocalDevice));
  }, [currentLocalDevice, devices.devices, syncChannelState, transfer, ui.activeChannelId, upsertChannelEvent]);

  const deleteChannelEvent = useCallback((id: string) => {
    void invoke<ChannelEvent | null>("delete_channel_event", { id })
      .then((event) => {
        if (event) upsertChannelEvent(event);
        return syncChannelState();
      })
      .catch(() => undefined);
  }, [syncChannelState, upsertChannelEvent]);

  const editChannelMessage = useCallback((id: string, text: string) => {
    void invoke<ChannelEvent | null>("edit_channel_text_event", { id, text })
      .then((event) => {
        if (event) upsertChannelEvent(event);
        return syncChannelState();
      })
      .catch((error) => {
        useUiStore.getState().showToast(String(error));
      });
  }, [syncChannelState, upsertChannelEvent]);

  const downloadChannelAsset = useCallback((id: string) => {
    void invoke<ChannelEvent>("download_channel_asset", { eventId: id })
      .then(upsertChannelEvent)
      .catch((error) => {
        useUiStore.getState().showToast(String(error));
      });
  }, [upsertChannelEvent]);

  const openChannelAsset = useCallback((path: string) => {
    void invoke("open_file", { path }).catch((error) => {
      useUiStore.getState().showToast(String(error));
    });
  }, []);

  const isTransferring = transfer.outgoing != null || transfer.receiving != null || transfer.progress.length > 0;

  const content = ui.view === "channel" ? (
    <ChannelShare
      channel={activeChannel}
      localDevice={currentLocalDevice}
      devices={devices.devices}
      loading={devices.loading}
      error={devices.error}
      files={transfer.files}
      progress={transfer.progress}
      transferError={transfer.error}
      onRefresh={devices.refresh}
      onPickFiles={() => transfer.pick("files")}
      onPickFolder={() => transfer.pick("folder")}
      onRemoveFile={transfer.removeFile}
      onClearFiles={transfer.clearFiles}
      onSendFiles={sendChannelFiles}
      onSendMessage={sendChannelMessage}
      onDeleteEvent={deleteChannelEvent}
      onEditMessage={editChannelMessage}
      onDownloadAsset={downloadChannelAsset}
      onOpenAsset={openChannelAsset}
      onCancel={(id) => transfer.cancel(id)}
    />
  ) : ui.view === "receive" ? (
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
        channels={channels}
        selected={devices.selectedDevice}
        loading={devices.loading}
        error={devices.error}
        view={ui.view}
        activeChannelId={ui.activeChannelId}
        onView={ui.setView}
        onChannel={ui.setChannel}
        onCreateChannel={createChannel}
        onRenameChannel={renameChannel}
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
