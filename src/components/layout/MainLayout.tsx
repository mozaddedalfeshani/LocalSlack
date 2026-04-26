import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { DeviceInfo } from "../../types";

interface Props {
  children: ReactNode;
  deviceName: string;
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: "send" | "clipboard" | "history";
  onView: (view: "send" | "clipboard" | "history") => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function MainLayout(props: Props) {
  return (
    <div className="flex h-screen flex-col bg-bg-primary text-text-primary">
      <TopBar deviceName={props.deviceName} onSettings={props.onSettings} />
      <div className="flex min-h-0 flex-1">
        <Sidebar {...props} />
        <main className="min-w-0 flex-1 overflow-auto p-6">{props.children}</main>
      </div>
    </div>
  );
}
