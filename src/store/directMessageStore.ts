import { create } from "zustand";
import type { DirectMessageEvent } from "../types";

interface DirectMessageStore {
  threads: Record<string, DirectMessageEvent[]>;
  loading: boolean;
  error?: string;
  setThread: (peerId: string, events: DirectMessageEvent[]) => void;
  upsertEvent: (event: DirectMessageEvent) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
}

export const useDirectMessageStore = create<DirectMessageStore>((set) => ({
  threads: {},
  loading: false,
  setThread: (peerId, events) =>
    set((state) => ({
      threads: { ...state.threads, [peerId]: sortEvents(events) }
    })),
  upsertEvent: (event) =>
    set((state) => {
      const thread = state.threads[event.peerId] ?? [];
      const existing = thread.find((item) => item.id === event.id);
      if (existing && existing.updatedAt > event.updatedAt) return state;
      return {
        threads: {
          ...state.threads,
          [event.peerId]: sortEvents([...thread.filter((item) => item.id !== event.id), event])
        }
      };
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));

function sortEvents(events: DirectMessageEvent[]): DirectMessageEvent[] {
  return [...events].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
