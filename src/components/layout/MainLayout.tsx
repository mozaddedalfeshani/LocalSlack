import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { ShareChannel } from "../../data/channels";
import type { ChannelId, DeviceInfo } from "../../types";
import type { MainView } from "../../store/uiStore";

interface Props {
  children: ReactNode;
  deviceName: string;
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: MainView;
  channels: ShareChannel[];
  activeChannelId: ChannelId;
  activeDmDeviceId?: string;
  onView: (view: MainView) => void;
  onChannel: (channelId: ChannelId) => void;
  onDirectMessage: (device: DeviceInfo) => void;
  onRefreshDevices: () => void;
  onCreateChannel: (name: string) => void;
  onRenameChannel: (channelId: string, name: string) => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function MainLayout(props: Props) {
  return (
    <div className="app-shell flex h-screen overflow-hidden text-text-primary">
      <Sidebar {...props} />
      <main className="min-w-0 flex-1 overflow-hidden bg-bg-primary/75">{props.children}</main>
    </div>
  );
}
