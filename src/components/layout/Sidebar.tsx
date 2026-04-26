import { Clock, Send, Clipboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FavoritesList } from "../favorites/FavoritesList";
import { DeviceList } from "../devices/DeviceList";
import type { DeviceInfo } from "../../types";

interface Props {
  devices: DeviceInfo[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: string;
  onView: (view: "send" | "clipboard" | "history") => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
}

export function Sidebar(props: Props) {
  const { t } = useTranslation();
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-5 border-r border-border bg-bg-secondary p-4">
      <nav className="grid grid-cols-3 gap-2">
        <button className={`nav-button ${props.view === "send" ? "active" : ""}`} onClick={() => props.onView("send")}><Send size={16} />Send</button>
        <button className={`nav-button ${props.view === "clipboard" ? "active" : ""}`} onClick={() => props.onView("clipboard")}><Clipboard size={16} />Text</button>
        <button className={`nav-button ${props.view === "history" ? "active" : ""}`} onClick={() => props.onView("history")}><Clock size={16} />Log</button>
      </nav>
      <FavoritesList devices={props.devices} onSelect={props.onSelect} />
      <section className="min-h-0 flex-1 overflow-auto">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t("devices.title")}</h2>
        <DeviceList
          devices={props.devices}
          selected={props.selected}
          loading={props.loading}
          error={props.error}
          onSelect={props.onSelect}
          onToggleFavorite={props.onToggleFavorite}
        />
      </section>
    </aside>
  );
}
