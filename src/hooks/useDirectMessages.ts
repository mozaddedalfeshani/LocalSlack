import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDirectMessageStore } from "../store/directMessageStore";
import type { DeviceInfo, DirectMessageEvent } from "../types";

export function useDirectMessages(peer?: DeviceInfo) {
  const store = useDirectMessageStore();
  const peerId = peer?.id;
  const [isSending, setIsSending] = useState(false);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!peerId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    store.setLoading(true);
    store.setError(undefined);
    try {
      const events = await invoke<DirectMessageEvent[]>("get_direct_messages", { peerId });
      store.setThread(peerId, events);
    } catch (error) {
      store.setError(String(error));
    } finally {
      store.setLoading(false);
      isFetchingRef.current = false;
    }
  }, [peerId, store.setError, store.setLoading, store.setThread]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll every second to keep messages in sync
  useEffect(() => {
    if (!peerId) return;
    const id = setInterval(() => void refresh(), 1000);
    return () => clearInterval(id);
  }, [peerId, refresh]);

  useEffect(() => {
    const unlisten = listen<DirectMessageEvent>("direct-message-updated", (event) => {
      useDirectMessageStore.getState().upsertEvent(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, []);

  const sendText = async (target: DeviceInfo, text: string) => {
    store.setError(undefined);
    try {
      const event = await invoke<DirectMessageEvent>("send_direct_text", { target, text });
      store.upsertEvent(event);
    } catch (error) {
      store.setError(String(error));
      await refresh();
    }
  };

  const sendFiles = async (target: DeviceInfo, filePaths: string[]) => {
    store.setError(undefined);
    setIsSending(true);
    try {
      const events = await invoke<DirectMessageEvent[]>("send_direct_files", { target, filePaths });
      events.forEach(store.upsertEvent);
    } catch (error) {
      store.setError(String(error));
      await refresh();
    } finally {
      setIsSending(false);
    }
  };

  return {
    ...store,
    events: peerId ? store.threads[peerId] ?? [] : [],
    refresh,
    sendText,
    sendFiles,
    isSending,
  };
}
