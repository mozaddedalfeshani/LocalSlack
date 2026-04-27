import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useTransferStore } from "../store/transferStore";
import type { DeviceInfo, IncomingTransferRequest, ReceivingTransfer, TransferProgress } from "../types";
import { pickDesktopFiles } from "../utils/fileUtils";
import { showIncomingAttention } from "../utils/windowAttention";

export function useTransfer() {
  const store = useTransferStore();

  useEffect(() => {
    const unlisten = listen<TransferProgress>("transfer-progress", (event) => store.setProgress(event.payload));

    const unlistenIncoming = listen<IncomingTransferRequest>("incoming-request", (event) => {
      store.setIncoming(event.payload);
      void showIncomingAttention(
        `${event.payload.sender.name} wants to send files`,
        event.payload.files.map((file) => file.name).join(", ")
      );
    });

    const unlistenReceiving = listen<ReceivingTransfer>("receiving-started", (event) => {
      store.setReceiving(event.payload);
      void showIncomingAttention(
        `Receiving from ${event.payload.sender.name}`,
        `${event.payload.files.length} item${event.payload.files.length === 1 ? "" : "s"} incoming`
      );
    });

    // Auto-clear sender progress bars 2 seconds after transfer completes
    const unlistenComplete = listen<string>("transfer-complete", () => {
      window.setTimeout(() => store.clearProgress(), 2000);
    });

    // Clear progress on transfer failure too
    const unlistenFailed = listen<string>("transfer-failed", () => {
      window.setTimeout(() => store.clearProgress(), 3000);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
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
      store.setError("Some files have no OS path. Use the File / Folder picker or drag from Finder.");
      return;
    }
    try {
      await invoke("send_files", { target, filePaths: paths });
      store.setSuccess("Transfer complete!");
    } catch (err) {
      store.setError(String(err));
      store.clearProgress();
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

  const dismissReceiving = () => store.setReceiving(undefined);

  return { ...store, send, cancel, pick, acceptIncoming, rejectIncoming, dismissReceiving, clearProgress: store.clearProgress };
}
