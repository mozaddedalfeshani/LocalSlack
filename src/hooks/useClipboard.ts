import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { ClipboardPayload, DeviceInfo } from "../types";
import { decodeChannelText } from "../utils/channelPayload";

export function useClipboard() {
  const [received, setReceived] = useState<ClipboardPayload>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const unlisten = listen<ClipboardPayload>("clipboard-received", (event) => {
      if (decodeChannelText(event.payload.text)) return;
      setReceived(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, []);
  return {
    received,
    error,
    clearReceived: () => setReceived(undefined),
    read: async () => {
      setError(undefined);
      try {
        if (navigator.clipboard?.readText) {
          return await navigator.clipboard.readText();
        }
      } catch {
        // Fall back to the Rust clipboard bridge below.
      }
      return invoke<string>("read_clipboard").catch((err) => {
        setError(`Clipboard read failed. Paste with Ctrl+V or grant clipboard access. ${String(err)}`);
        return "";
      });
    },
    write: async (text: string) => {
      setError(undefined);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return;
        }
      } catch {
        // Fall back to the Rust clipboard bridge below.
      }
      return invoke("write_clipboard", { text }).catch((err) =>
        setError(`Clipboard write failed. ${String(err)}`)
      );
    },
    send: (target: DeviceInfo, text: string) => invoke("send_clipboard_text", { target, text }).catch((err) => setError(String(err)))
  };
}
