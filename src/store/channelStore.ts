import { create } from "zustand";
import { channels as defaultChannels, decorateChannel, type ShareChannel } from "../data/channels";
import type { ChannelEvent, SlackInfo } from "../types";

interface ChannelStore {
  channels: ShareChannel[];
  events: ChannelEvent[];
  setSlackInfo: (info: SlackInfo) => void;
  setEvents: (events: ChannelEvent[]) => void;
  upsertEvent: (event: ChannelEvent) => void;
}

export const useChannelStore = create<ChannelStore>((set) => ({
  channels: defaultChannels,
  events: [],
  setSlackInfo: (info) =>
    set({
      channels: info.channels.length > 0 ? info.channels.map(decorateChannel) : defaultChannels,
    }),
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
