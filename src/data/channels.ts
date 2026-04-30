import { Hash, Image, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SlackChannel } from "../types";

export interface ShareChannel {
  id: string;
  name: string;
  title: string;
  description: string;
  messageCount: number;
  lastNameChanges: SlackChannel["lastNameChanges"];
  icon: LucideIcon;
}

const defaultChannels = [
  {
    id: "general",
    name: "general",
    title: "General",
    description: "Open room for everyday team files.",
    messageCount: 0,
    lastNameChanges: [],
    icon: Hash,
  },
  {
    id: "media",
    name: "media-share",
    title: "Media Share",
    description: "Photos, screenshots, and design assets.",
    messageCount: 0,
    lastNameChanges: [],
    icon: Image,
  },
  {
    id: "announcements",
    name: "announcements",
    title: "Announcements",
    description: "Important files everyone should receive.",
    messageCount: 0,
    lastNameChanges: [],
    icon: Megaphone,
  },
] satisfies ShareChannel[];

export const channels: ShareChannel[] = defaultChannels;
export type ChannelId = string;

export function decorateChannel(channel: SlackChannel): ShareChannel {
  return {
    ...channel,
    icon: channelIcon(channel.id),
  };
}

export function getChannel(channelId: string, availableChannels: ShareChannel[] = channels): ShareChannel {
  return availableChannels.find((channel) => channel.id === channelId) ?? availableChannels[0] ?? channels[0];
}

function channelIcon(channelId: string): LucideIcon {
  if (channelId === "media") return Image;
  if (channelId === "announcements") return Megaphone;
  return Hash;
}
