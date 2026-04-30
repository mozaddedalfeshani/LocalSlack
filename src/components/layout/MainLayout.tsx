import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { ShareChannel } from "../../data/channels";
import type { ChannelId, DeviceInfo } from "../../types";

interface Props {
  children: ReactNode;
  deviceName: string;
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: "channel" | "receive" | "send" | "clipboard" | "history" | "settings";
  channels: ShareChannel[];
  activeChannelId: ChannelId;
  onView: (view: "channel" | "receive" | "send" | "clipboard" | "history" | "settings") => void;
  onChannel: (channelId: ChannelId) => void;
  onCreateChannel: (name: string) => void;
  onRenameChannel: (channelId: string, name: string) => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function MainLayout(props: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      <Sidebar {...props} />
      <main className="min-w-0 flex-1 overflow-hidden bg-bg-primary">{props.children}</main>
    </div>
  );
}
