import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useTransferStore } from "../store/transferStore";
import type { DeviceInfo, TransferProgress } from "../types";

export function useTransfer() {
  const store = useTransferStore();
  useEffect(() => {
    const unlisten = listen<TransferProgress>("transfer-progress", (event) => store.setProgress(event.payload));
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, []);
  const send = async (target: DeviceInfo) => {
    store.setError(undefined);
    const paths = store.files.map((item) => item.path).filter(Boolean) as string[];
    if (paths.length !== store.files.length) {
      store.setError("Desktop file paths are required for sending. Use the Tauri file picker or drag files from the OS.");
      return;
    }
    await invoke("send_files", { target, filePaths: paths });
    store.setSuccess("Transfer started");
  };
  const cancel = async (sessionId: string) => invoke("cancel_transfer", { sessionId });
  return { ...store, send, cancel };
}
