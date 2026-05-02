import { XCircle } from "lucide-react";
import type { TransferProgress as Progress } from "../../types";
import { formatBytes, formatEta, formatSpeed } from "../../utils/formatUtils";

export function TransferProgress({
  items,
  onCancel,
}: {
  items: Progress[];
  onCancel: (sessionId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6 space-y-3">
      {items.map((item) => {
        const percent = item.totalBytes
          ? Math.min(
              100,
              Math.round((item.bytesTransferred / item.totalBytes) * 100),
            )
          : 0;
        return (
          <div
            key={`${item.sessionId}-${item.fileId}`}
            className="rounded-md border border-border bg-bg-secondary p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.fileName}</p>
                <p className="text-xs text-text-muted">
                  {percent}% · {formatSpeed(item.speedBps)} · ETA{" "}
                  {formatEta(item.etaSeconds)} · {formatBytes(item.totalBytes)}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => onCancel(item.sessionId)}
                aria-label="Cancel transfer"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-bg-elevated">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
