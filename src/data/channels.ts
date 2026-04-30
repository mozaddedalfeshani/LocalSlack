import { Hash, Image, Megaphone } from "lucide-react";

export const channels = [
  {
    id: "general",
    name: "general",
    title: "General",
    description: "Open room for everyday team files.",
    icon: Hash,
  },
  {
    id: "media",
    name: "media-share",
    title: "Media Share",
    description: "Photos, screenshots, and design assets.",
    icon: Image,
  },
  {
    id: "announcements",
    name: "announcements",
    title: "Announcements",
    description: "Important files everyone should receive.",
    icon: Megaphone,
  },
] as const;

export type ChannelId = typeof channels[number]["id"];
export type ShareChannel = typeof channels[number];

export function getChannel(channelId: string): ShareChannel {
  return channels.find((channel) => channel.id === channelId) ?? channels[0];
}
