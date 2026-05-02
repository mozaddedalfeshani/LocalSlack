import { ArrowLeft, CheckCircle2, FileText, XCircle } from "lucide-react";
import type {
  OutgoingTransfer,
  ReceivingTransfer,
  TransferProgress,
} from "../../types";
import { formatBytes, formatSpeed } from "../../utils/formatUtils";

interface Props {
  outgoing?: OutgoingTransfer;
  receiving?: ReceivingTransfer;
  progress: TransferProgress[];
  transferComplete: boolean;
  onCancel: (sessionId: string) => void;
  onDone: () => void;
}

export function ProgressPage({
  outgoing,
  receiving,
  progress,
  transferComplete,
  onCancel,
  onDone,
}: Props) {
  const visible = receiving != null || outgoing != null || progress.length > 0;
  if (!visible) return null;

  const isReceiving = receiving != null;
  const peerName = receiving?.sender.name ?? outgoing?.target.name ?? "Device";
  const sessionId =
    receiving?.sessionId ?? outgoing?.sessionId ?? progress[0]?.sessionId;

  const files = isReceiving
    ? receiving!.files.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        progress: progress.find(
          (p) => p.sessionId === receiving!.sessionId && p.fileId === file.id,
        ),
      }))
    : progress.length > 0
      ? progress.map((p) => ({
          id: p.fileId,
          name: p.fileName,
          size: p.totalBytes,
          progress: p,
        }))
      : (outgoing?.files ?? []).map((f) => ({
          id: f.id,
          name: f.file.name,
          size: f.file.size,
          progress: undefined,
        }));

  const totals = files.reduce(
    (sum, f) => {
      const total = f.progress?.totalBytes ?? f.size;
      const done = Math.min(f.progress?.bytesTransferred ?? 0, total);
      return { done: sum.done + done, total: sum.total + total };
    },
    { done: 0, total: 0 },
  );
  const overallPct = totals.total
    ? Math.min(100, Math.round((totals.done / totals.total) * 100))
    : 0;
  const allDone =
    transferComplete ||
    (files.length > 0 &&
      files.every((f) => {
        const total = f.progress?.totalBytes ?? f.size;
        return total > 0 && (f.progress?.bytesTransferred ?? 0) >= total;
      }));

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
        <button
          type="button"
          onClick={allDone ? onDone : undefined}
          disabled={!allDone && !sessionId}
          className="plain-icon-button disabled:opacity-30"
          title="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-text-primary">
            {allDone
              ? isReceiving
                ? "Received successfully"
                : "Sent successfully"
              : isReceiving
                ? `Receiving from ${peerName}`
                : outgoing?.sessionId
                  ? `Sending to ${peerName}`
                  : `Connecting to ${peerName}…`}
          </h1>
          <p className="text-sm text-text-muted">
            {files.length} file{files.length !== 1 ? "s" : ""} ·{" "}
            {formatBytes(totals.total)}
          </p>
        </div>
        {allDone ? (
          <button
            className="primary-button bg-success text-white hover:bg-success/90"
            onClick={onDone}
          >
            <CheckCircle2 size={18} />
            Done
          </button>
        ) : sessionId ? (
          <button
            className="secondary-button border-error/50 bg-error/10 text-text-primary hover:border-error"
            onClick={() => onCancel(sessionId)}
          >
            <XCircle size={18} />
            Cancel
          </button>
        ) : null}
      </div>

      {/* Overall progress bar */}
      <div className="px-6 py-4">
        <div className="mb-1 flex items-center justify-between text-sm text-text-muted">
          <span>{allDone ? "Complete" : `${overallPct}%`}</span>
          <span>
            {formatBytes(totals.done)} / {formatBytes(totals.total)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="space-y-3">
          {files.map((f) => {
            const total = f.progress?.totalBytes ?? f.size;
            const bytes = Math.min(f.progress?.bytesTransferred ?? 0, total);
            const pct = total
              ? Math.min(100, Math.round((bytes / total) * 100))
              : 0;
            const done = pct >= 100;
            return (
              <div
                key={f.id}
                className="flex gap-3 rounded-md border border-border/40 bg-bg-surface p-3"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-bg-elevated text-text-muted">
                  <FileText size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-text-primary">
                      {f.name}
                    </p>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatBytes(total)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {done
                      ? "Done"
                      : f.progress
                        ? `${formatSpeed(f.progress.speedBps)} · ${pct}%`
                        : "Waiting…"}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${done ? "bg-success" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
