import { FolderOpen, Search, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "../../hooks/useHistory";
import { formatBytes, formatTime } from "../../utils/formatUtils";

export function HistoryList() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const history = useHistory(filter);
  const entries = useMemo(
    () =>
      history.entries.filter((entry) =>
        `${entry.fileName} ${entry.deviceName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [history.entries, query],
  );
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-72 flex-1">
          <Search size={16} className="absolute left-3 top-3 text-text-muted" />
          <input
            className="input pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("history.search")}
          />
        </div>
        <div className="flex gap-2">
          {["all", "sent", "received", "today", "week"].map((item) => (
            <button
              key={item}
              className={`secondary-button ${filter === item ? "selected" : ""}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="secondary-button"
          onClick={() => window.confirm("Clear history?") && history.clear()}
        >
          <Trash2 size={16} />
          {t("history.clear")}
        </button>
      </div>
      {history.loading && <p className="text-text-muted">Loading history...</p>}
      {history.error && <p className="text-error">{history.error}</p>}
      {!history.loading && entries.length === 0 && (
        <p className="text-text-muted">{t("history.empty")}</p>
      )}
      <div className="space-y-2">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="flex items-center gap-3 rounded-md border border-border bg-bg-secondary p-3"
          >
            <span className="text-xl text-accent">
              {String(entry.direction).toLowerCase() === "sent" ? "↑" : "↓"}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium">{entry.fileName}</h3>
              <p className="text-xs text-text-muted">
                {entry.deviceName} · {formatTime(entry.timestamp)} ·{" "}
                {formatBytes(entry.fileSize)}
              </p>
            </div>
            <button
              className="icon-button"
              onClick={() => invoke("open_folder", { path: entry.filePath })}
              aria-label="Open folder"
            >
              <FolderOpen size={17} />
            </button>
            <button
              className="icon-button"
              onClick={() => history.deleteEntry(entry.id)}
              aria-label="Delete entry"
            >
              <Trash2 size={17} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
