import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, FileText, Info, XCircle } from "lucide-react";
import type { OutgoingTransfer, ReceivingTransfer, TransferProgress } from "../../types";
import { formatBytes, formatSpeed } from "../../utils/formatUtils";

interface Props {
  outgoing?: OutgoingTransfer;
  receiving?: ReceivingTransfer;
  progress: TransferProgress[];
  onCancel: (sessionId: string) => void;
  onDone: () => void;
}

interface FileRow {
  id: string;
  name: string;
  size: number;
  progress?: TransferProgress;
}

export function TransferActivityDialog({ outgoing, receiving, progress, onCancel, onDone }: Props) {
  const mode = receiving ? "receiving" : outgoing ? "sending" : progress.length > 0 ? "sending" : undefined;
  if (!mode) return null;

  const peerName = receiving?.sender.name ?? outgoing?.target.name ?? "Device";
  const sessionId = receiving?.sessionId ?? outgoing?.sessionId ?? progress[0]?.sessionId;
  const files: FileRow[] = receiving
    ? receiving.files.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        progress: progress.find((item) => item.sessionId === receiving.sessionId && item.fileId === file.id)
      }))
    : progress.length > 0
      ? progress.map((item) => ({
          id: item.fileId,
          name: item.fileName,
          size: item.totalBytes,
          progress: item
        }))
      : (outgoing?.files ?? []).map((item) => ({
          id: item.id,
          name: item.file.name,
          size: item.file.size
        }));

  const totals = files.reduce(
    (sum, item) => {
      const total = item.progress?.totalBytes || item.size;
      const done = Math.min(item.progress?.bytesTransferred ?? 0, total);
      return { done: sum.done + done, total: sum.total + total };
    },
    { done: 0, total: 0 }
  );
  const overallPercent = totals.total ? Math.min(100, Math.round((totals.done / totals.total) * 100)) : 0;
  const done = files.length > 0 && files.every((item) => {
    const total = item.progress?.totalBytes || item.size;
    return total > 0 && (item.progress?.bytesTransferred ?? 0) >= total;
  });
  const Icon = mode === "receiving" ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-3xl rounded-md border border-border bg-bg-secondary p-4 shadow-panel">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={19} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
            {done ? "Transfer finished" : mode === "receiving" ? "Receiving files" : sessionId ? "Sending files" : "Preparing transfer"}
          </h2>
        </div>
          <p className="truncate text-sm text-text-muted">
            {mode === "receiving" ? "From" : "To"} {peerName}
          </p>
        </div>
        {done ? (
          <button className="primary-button bg-success text-white hover:bg-success/90" onClick={onDone}>
            <CheckCircle2 size={18} />
            Done
          </button>
        ) : mode === "sending" && sessionId ? (
          <button className="secondary-button border-error/50 bg-error/10 text-text-primary hover:border-error" onClick={() => onCancel(sessionId)}>
            <XCircle size={18} />
            Cancel
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Info size={18} />
            {overallPercent}%
          </div>
        )}
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded bg-bg-elevated">
        <div className="h-full rounded bg-accent transition-all" style={{ width: `${overallPercent}%` }} />
      </div>

      <div className="max-h-56 space-y-3 overflow-auto pr-1">
        {files.map((item) => {
          const total = item.progress?.totalBytes || item.size;
          const bytes = Math.min(item.progress?.bytesTransferred ?? 0, total);
          const percent = total ? Math.min(100, Math.round((bytes / total) * 100)) : 0;
          return (
            <div key={item.id} className="flex gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-bg-elevated text-text-primary">
                <FileText size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium text-text-primary">{item.name}</p>
                  <p className="shrink-0 text-xs text-text-muted">{formatBytes(total)}</p>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {percent >= 100 ? "Done" : item.progress ? `${formatSpeed(item.progress.speedBps)} · ${percent}%` : "Waiting..."}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded bg-bg-elevated">
                  <div className="h-full rounded bg-success transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
