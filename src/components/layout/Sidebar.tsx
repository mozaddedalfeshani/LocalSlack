import { Send, Settings, Wifi } from "lucide-react";
import type { DeviceInfo } from "../../types";

interface Props {
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: string;
  onView: (view: "receive" | "send" | "clipboard" | "history" | "settings") => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function Sidebar(props: Props) {
  const items = [
    { id: "receive" as const, label: "Receive", icon: Wifi },
    { id: "send" as const, label: "Send", icon: Send },
    { id: "settings" as const, label: "Settings", icon: Settings }
  ];
  return (
    <aside className="flex w-[255px] shrink-0 flex-col bg-bg-secondary px-3 py-10 text-text-primary">
      <h1 className="mb-12 px-8 text-3xl font-semibold tracking-tight">SwiftShare</h1>
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
                <Icon size={23} strokeWidth={2.2} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
