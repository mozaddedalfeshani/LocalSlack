import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { ClipboardPayload, DeviceInfo } from "../types";

export function useClipboard() {
  const [received, setReceived] = useState<ClipboardPayload>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const unlisten = listen<ClipboardPayload>("clipboard-received", (event) => setReceived(event.payload));
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, []);
  return {
    received,
    error,
    clearReceived: () => setReceived(undefined),
    read: () => invoke<string>("read_clipboard").catch((err) => { setError(String(err)); return ""; }),
    write: (text: string) => invoke("write_clipboard", { text }).catch((err) => setError(String(err))),
    send: (target: DeviceInfo, text: string) => invoke("send_clipboard_text", { target, text }).catch((err) => setError(String(err)))
  };
}
