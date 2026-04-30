import { create } from "zustand";
import type { ChannelEvent } from "../types";

interface ChannelStore {
  events: ChannelEvent[];
  setEvents: (events: ChannelEvent[]) => void;
  upsertEvent: (event: ChannelEvent) => void;
}

export const useChannelStore = create<ChannelStore>((set) => ({
  events: [],
  setEvents: (events) => set({ events: sortEvents(events) }),
  upsertEvent: (event) =>
    set((state) => {
      const existing = state.events.find((item) => item.id === event.id);
      if (existing && existing.updatedAt > event.updatedAt) return state;
      return { events: sortEvents([...state.events.filter((item) => item.id !== event.id), event]) };
    }),
}));

function sortEvents(events: ChannelEvent[]): ChannelEvent[] {
  return [...events].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
