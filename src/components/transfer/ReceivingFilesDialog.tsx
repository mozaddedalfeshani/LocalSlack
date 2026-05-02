import { CheckCircle2, FileText, Info } from "lucide-react";
import type { ReceivingTransfer, TransferProgress } from "../../types";
import { formatBytes, formatSpeed } from "../../utils/formatUtils";

export function ReceivingFilesDialog({
  transfer,
  progress,
  onDone,
}: {
  transfer?: ReceivingTransfer;
  progress: TransferProgress[];
  onDone: () => void;
}) {
  if (!transfer) return null;

  const items = transfer.files.map((file) => {
    const current = progress.find(
      (item) =>
        item.sessionId === transfer.sessionId && item.fileId === file.id,
    );
    const received = current?.bytesTransferred ?? 0;
    const total = current?.totalBytes || file.size;
    const percent = total
      ? Math.min(100, Math.round((received / total) * 100))
      : 0;
    return { file, current, received, total, percent };
  });
  const done = items.length > 0 && items.every((item) => item.percent >= 100);
  const totalBytes = items.reduce((sum, item) => sum + item.total, 0);
  const receivedBytes = items.reduce(
    (sum, item) => sum + Math.min(item.received, item.total),
    0,
  );
  const overallPercent = totalBytes
    ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
    : 0;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-md border border-border bg-bg-secondary p-4 shadow-panel">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">
            {done ? "Finished" : "Receiving files"}
          </h2>
          <p className="truncate text-sm text-text-muted">
            From {transfer.sender.name}
          </p>
        </div>
        {done ? (
          <button
            className="primary-button bg-success text-white hover:bg-success/90"
            onClick={onDone}
          >
            <CheckCircle2 size={18} />
            Done
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Info size={18} />
            {overallPercent}%
          </div>
        )}
      </div>

      <div className="max-h-56 space-y-3 overflow-auto pr-1">
        {items.map(({ file, current, total, percent }) => (
          <div key={file.id} className="flex gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-bg-elevated text-text-primary">
              <FileText size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium text-text-primary">
                  {file.name}
                </p>
                <p className="shrink-0 text-xs text-text-muted">
                  {formatBytes(total)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">
                {done || percent >= 100
                  ? "Done"
                  : current
                    ? formatSpeed(current.speedBps)
                    : "Waiting..."}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded bg-bg-elevated">
                <div
                  className="h-full rounded bg-success transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
