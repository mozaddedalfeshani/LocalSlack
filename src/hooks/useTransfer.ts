import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useTransferStore } from "../store/transferStore";
import { useUiStore } from "../store/uiStore";
import type { ChannelId } from "../data/channels";
import type { DeviceInfo, IncomingTransferRequest, ReceivingTransfer, TransferProgress, TransferStarted } from "../types";
import { encodeChannelText } from "../utils/channelPayload";
import { pickDesktopFiles } from "../utils/fileUtils";
import { showIncomingAttention } from "../utils/windowAttention";

function showRequest(request: IncomingTransferRequest) {
  const current = useTransferStore.getState().incoming;
  useTransferStore.getState().setIncoming(request);
  useUiStore.getState().setView("receive");
  if (current?.sessionId === request.sessionId) return;
  void showIncomingAttention(
    `${request.sender.name} wants to send files`,
    request.files.map((file) => file.name).join(", ")
  );
}

export function useTransfer() {
  const store = useTransferStore();

  useEffect(() => {
    const syncPendingIncoming = async () => {
      try {
        const requests = await invoke<IncomingTransferRequest[]>("get_pending_incoming");
        if (requests.length === 0) return;
        const current = useTransferStore.getState().incoming;
        const next = requests[0];
        if (current?.sessionId === next.sessionId) return;
        showRequest(next);
      } catch {
        // Polling is a fallback only.
      }
    };

    const unlisten = listen<TransferProgress>("transfer-progress", (event) => store.setProgress(event.payload));

    const unlistenStarted = listen<TransferStarted>("transfer-started", (event) => {
      useTransferStore.getState().setOutgoingSessionId(event.payload.sessionId);
    });

    const unlistenIncoming = listen<IncomingTransferRequest>("incoming-request", (event) => {
      showRequest(event.payload);
    });

    const unlistenReceiving = listen<ReceivingTransfer>("receiving-started", (event) => {
      store.setIncoming(undefined);
      store.setReceiving(event.payload);
      useUiStore.getState().setView("receive");
      void showIncomingAttention(
        `Receiving from ${event.payload.sender.name}`,
        `${event.payload.files.length} item${event.payload.files.length === 1 ? "" : "s"} incoming`
      );
    });

    const unlistenComplete = listen<string>("transfer-complete", () => {
      useTransferStore.getState().setTransferComplete(true);
    });

    const unlistenFailed = listen<string>("transfer-failed", () => {
      useTransferStore.getState().setTransferComplete(true);
    });

    void syncPendingIncoming();
    const pollId = window.setInterval(() => {
      void syncPendingIncoming();
    }, 1000);

    return () => {
      window.clearInterval(pollId);
      unlisten.then((fn) => fn()).catch(() => undefined);
      unlistenStarted.then((fn) => fn()).catch(() => undefined);
      unlistenIncoming.then((fn) => fn()).catch(() => undefined);
      unlistenReceiving.then((fn) => fn()).catch(() => undefined);
      unlistenComplete.then((fn) => fn()).catch(() => undefined);
      unlistenFailed.then((fn) => fn()).catch(() => undefined);
    };
  }, []);

  const send = async (target: DeviceInfo) => {
    store.setError(undefined);
    store.clearProgress(); // Clear stale bars from previous transfer
    const paths = store.files.map((item) => item.path).filter(Boolean) as string[];
    if (paths.length !== store.files.length) {
      store.setError("Some files have no OS path. Use the File / Folder picker or drag from your File Manager.");
      return;
    }
    try {
      store.setTransferComplete(false);
      store.setOutgoing({ target, files: [...store.files] });
      await invoke("send_files", { target, filePaths: paths });
    } catch (err) {
      store.setError(String(err));
      store.setTransferComplete(true);
    }
  };

  const sendToDevices = async (targets: DeviceInfo[], label: string, channelId?: ChannelId, assetIds?: string[]) => {
    store.setError(undefined);
    store.clearProgress();
    const paths = store.files.map((item) => item.path).filter(Boolean) as string[];
    if (paths.length !== store.files.length) {
      store.setError("Some files have no OS path. Use the File / Folder picker or drag from your File Manager.");
      return;
    }
    if (targets.length === 0) {
      store.setError("No channel members are online. Ask teammates to open LocalSlack on the same Wi-Fi.");
      return;
    }

    const channelTarget: DeviceInfo = {
      id: `channel:${label.toLowerCase().replace(/\s+/g, "-")}`,
      name: label,
      emoji: "#",
      ip: "channel",
      port: 0,
      deviceType: "Desktop",
      isFavorite: false,
      lastSeen: Math.floor(Date.now() / 1000),
    };

    try {
      store.setTransferComplete(false);
      store.setOutgoing({ target: channelTarget, files: [...store.files] });
      const results = await Promise.allSettled(
        targets.map((target) => invoke("send_files", { target, filePaths: paths, channelId, assetIds }))
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        store.setError(`${failed.length} of ${targets.length} channel deliveries failed.`);
      }
      if (failed.length === targets.length) {
        store.setTransferComplete(true);
      }
    } catch (err) {
      store.setError(String(err));
      store.setTransferComplete(true);
    }
  };

  const sendTextToDevices = async (targets: DeviceInfo[], channelId: ChannelId, text: string, sender: DeviceInfo) => {
    store.setError(undefined);
    if (targets.length === 0) {
      store.setError("No channel members are online. Ask teammates to open LocalSlack on the same Wi-Fi.");
      return;
    }
    const payload = encodeChannelText({
      channelId,
      text,
      sender: {
        id: sender.id,
        name: sender.name,
        emoji: sender.emoji,
      },
      timestamp: Math.floor(Date.now() / 1000),
    });
    const results = await Promise.allSettled(
      targets.map((target) => invoke("send_clipboard_text", { target, text: payload }))
    );
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      store.setError(`${failed.length} of ${targets.length} channel messages failed.`);
    }
  };

  const pick = async (kind: "files" | "folder") => {
    store.setError(undefined);
    try {
      const files = await pickDesktopFiles(kind);
      if (files.length > 0) store.addFiles(files);
    } catch (error) {
      store.setError(String(error));
    }
  };

  const cancel = async (sessionId: string) => invoke("cancel_transfer", { sessionId });

  const acceptIncoming = async () => {
    if (!store.incoming) return;
    await invoke("accept_transfer", { sessionId: store.incoming.sessionId });
    store.setIncoming(undefined);
  };

  const rejectIncoming = async () => {
    if (!store.incoming) return;
    await invoke("reject_transfer", { sessionId: store.incoming.sessionId });
    store.setIncoming(undefined);
  };

  const dismissReceiving = () => {
    store.setReceiving(undefined);
    store.setOutgoing(undefined);
    store.clearProgress();
    store.setTransferComplete(false);
  };

  return { ...store, send, sendToDevices, sendTextToDevices, cancel, pick, acceptIncoming, rejectIncoming, dismissReceiving, clearProgress: store.clearProgress };
}
