import { Settings, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TopBar({ deviceName, onSettings }: { deviceName: string; onSettings: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-bg-secondary px-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-white">
          <Share2 size={20} />
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary">{t("app.name")}</h1>
          <p className="text-xs text-text-muted">{deviceName}</p>
        </div>
      </div>
      <button type="button" onClick={onSettings} className="icon-button" aria-label="Settings">
        <Settings size={20} />
      </button>
    </header>
  );
}
