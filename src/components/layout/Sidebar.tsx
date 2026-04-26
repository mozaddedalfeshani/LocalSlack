import { Radio, Send, Settings, Wifi } from "lucide-react";
import type { DeviceInfo } from "../../types";

interface Props {
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: string;
  onView: (view: "receive" | "send" | "clipboard" | "history") => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function Sidebar(props: Props) {
  const items = [
    { id: "receive" as const, label: "Receive", icon: Wifi },
    { id: "send" as const, label: "Send", icon: Send },
    { id: "history" as const, label: "History", icon: Radio }
  ];
  return (
    <aside className="flex w-[260px] shrink-0 flex-col bg-[#10201b] px-4 py-10 text-[#dce9e4]">
      <h1 className="mb-12 px-8 text-3xl font-extrabold tracking-tight">SwiftShare</h1>
      <nav className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = props.view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`rail-button ${active ? "active" : ""}`}
              onClick={() => props.onView(item.id)}
            >
              <span className="rail-icon">
                <Icon size={25} strokeWidth={3} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
        <button type="button" className="rail-button" onClick={props.onSettings}>
          <span className="rail-icon">
            <Settings size={25} strokeWidth={3} />
          </span>
          <span>Settings</span>
        </button>
      </nav>
    </aside>
  );
}
