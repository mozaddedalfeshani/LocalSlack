import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { DeviceInfo } from "../../types";

interface Props {
  children: ReactNode;
  deviceName: string;
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: "receive" | "send" | "clipboard" | "history" | "settings";
  onView: (view: "receive" | "send" | "clipboard" | "history" | "settings") => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function MainLayout(props: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      <Sidebar {...props} />
      <main className="min-w-0 flex-1 overflow-auto bg-bg-primary px-9 py-8">{props.children}</main>
    </div>
  );
}
