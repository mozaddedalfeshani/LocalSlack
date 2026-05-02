import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "../../assets/logo.png";

export function TopBar({
  deviceName,
  onSettings,
}: {
  deviceName: string;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/60 bg-bg-secondary/80 px-5 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt=""
          className="h-9 w-9 rounded-lg object-cover shadow-sm"
          aria-hidden="true"
        />
        <div>
          <h1 className="font-display text-base font-bold text-text-primary">
            {t("app.name")}
          </h1>
          <p className="text-xs text-text-muted">{deviceName}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="icon-button"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
    </header>
  );
}
