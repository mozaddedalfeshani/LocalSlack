import { Clock3, Send, Settings, Wifi } from "lucide-react";
import { channels, type ChannelId } from "../../data/channels";
import type { DeviceInfo } from "../../types";
import logo from "../../assets/logo.png";

interface Props {
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: string;
  activeChannelId: ChannelId;
  onView: (view: "channel" | "receive" | "send" | "clipboard" | "history" | "settings") => void;
  onChannel: (channelId: ChannelId) => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

export function Sidebar(props: Props) {
  const items = [
    { id: "receive" as const, label: "Receive", icon: Wifi },
    { id: "send" as const, label: "Direct Send", icon: Send },
    { id: "history" as const, label: "History", icon: Clock3 },
    { id: "settings" as const, label: "Settings", icon: Settings }
  ];
  return (
    <aside className="flex w-[270px] shrink-0 flex-col bg-bg-secondary px-3 py-8 text-text-primary">
      <div className="mb-8 flex items-center gap-3 px-5">
        <img src={logo} alt="LocalSlack Logo" className="h-10 w-10 rounded-full object-cover shadow-sm" />
        <h1 className="text-2xl font-bold tracking-tight">LocalSlack</h1>
      </div>

      <div className="mb-8">
        <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Channels</p>
        <nav className="space-y-1">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const active = props.view === "channel" && props.activeChannelId === channel.id;
            return (
              <button
                key={channel.id}
                type="button"
                className={`rail-button ${active ? "active" : ""}`}
                onClick={() => props.onChannel(channel.id)}
              >
                <span className="rail-icon">
                  <Icon size={21} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1 truncate text-left"># {channel.name}</span>
                <span className="text-xs text-text-muted">{props.devices.length}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <nav className="space-y-1">
        <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Tools</p>
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
