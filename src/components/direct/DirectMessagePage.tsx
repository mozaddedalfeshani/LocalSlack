import { File, FolderOpen, Paperclip, RefreshCw, Send, X, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DeviceInfo, DirectMessageEvent, SelectedFile, TransferProgress as Progress } from "../../types";
import { formatBytes, formatTime } from "../../utils/formatUtils";
import { DeviceAvatar } from "../devices/DeviceAvatar";
import { TransferProgress } from "../transfer/TransferProgress";

interface Props {
  device?: DeviceInfo;
  localDevice: DeviceInfo;
  events: DirectMessageEvent[];
  files: SelectedFile[];
  progress: Progress[];
  loading?: boolean;
  error?: string;
  transferError?: string;
  onRefresh: () => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onSendText: (device: DeviceInfo, text: string) => void;
  onSendFiles: (device: DeviceInfo) => void;
  onOpenAsset: (path: string) => void;
  onCancel: (sessionId: string) => void;
}

export function DirectMessagePage(props: Props) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visibleEvents = useMemo(
    () => props.events.filter((event) => !event.deletedAt),
    [props.events]
  );
  const latestEventId = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1].id : undefined;
  const totalSize = props.files.reduce((sum, item) => sum + item.file.size, 0);
  const canSendText = Boolean(props.device && message.trim());
  const canSendFiles = Boolean(props.device && props.files.length);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [latestEventId, props.device?.id]);

  const submitMessage = () => {
    const text = message.trim();
    if (!text || !props.device) return;
    props.onSendText(props.device, text);
    setMessage("");
  };

  if (!props.device) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-border bg-bg-surface text-accent">
            <Send size={26} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-text-primary">Choose a member</h2>
          <p className="mt-2 text-sm text-text-muted">Pick someone from the left panel to start a direct message.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="grid h-full min-h-0 grid-rows-[5rem_minmax(0,1fr)_auto] overflow-hidden">
      <header className="flex h-20 items-center justify-between border-b border-border/60 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <DeviceAvatar device={props.device} />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-text-primary">{props.device.name}</h2>
            <p className="truncate text-sm text-text-muted">{props.device.ip} · online on this network</p>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={props.onRefresh} title="Refresh direct messages">
          <RefreshCw size={16} className={props.loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="min-h-0 overflow-y-auto px-6 py-5">
        {visibleEvents.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="max-w-sm text-center">
              <h3 className="text-lg font-semibold text-text-primary">No direct messages yet</h3>
              <p className="mt-2 text-sm text-text-muted">Send a message or share files with {props.device.name}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleEvents.map((event) => (
              <DirectMessageItem
                key={event.id}
                event={event}
                mine={event.authorId === props.localDevice.id}
                onOpen={() => event.filePath && props.onOpenAsset(event.filePath)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <footer className="border-t border-border/60 bg-bg-primary p-4">
        {props.files.length > 0 && (
          <div className="mb-3 rounded-md border border-border/70 bg-bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">
                {props.files.length} file{props.files.length === 1 ? "" : "s"} ready · {formatBytes(totalSize)}
              </p>
              <button type="button" className="plain-icon-button" onClick={props.onClearFiles} title="Clear files">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {props.files.map((item) => (
                <div key={item.id} className="flex max-w-44 shrink-0 items-center gap-2 rounded-md border border-border/50 bg-bg-elevated px-2 py-1.5">
                  <File size={16} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{item.file.name}</span>
                  <button type="button" className="text-text-muted hover:text-error" onClick={() => props.onRemoveFile(item.id)} title="Remove">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(props.error || props.transferError) && (
          <p className="mb-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            {props.error ?? props.transferError}
          </p>
        )}

        <div className="rounded-md border border-border/80 bg-bg-surface p-2">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSendText) submitMessage();
              }
            }}
            placeholder={`Message ${props.device.name}`}
            className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
            <div className="flex items-center gap-1">
              <button type="button" className="icon-button" onClick={props.onPickFiles} title="Attach files">
                <Paperclip size={17} />
              </button>
              <button type="button" className="icon-button" onClick={props.onPickFolder} title="Attach folder">
                <FolderOpen size={17} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="secondary-button" disabled={!canSendFiles} onClick={() => props.device && props.onSendFiles(props.device)}>
                <File size={16} />
                Share files
              </button>
              <button type="button" className="primary-button" disabled={!canSendText} onClick={submitMessage}>
                <Send size={16} />
                Send
              </button>
            </div>
          </div>
        </div>

        <TransferProgress items={props.progress} onCancel={props.onCancel} />
      </footer>
    </section>
  );
}

function DirectMessageItem({ event, mine, onOpen }: { event: DirectMessageEvent; mine: boolean; onOpen: () => void }) {
  const isText = String(event.kind).toLowerCase() === "text";
  return (
    <article className={`flex gap-3 ${mine ? "opacity-95" : ""}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-bg-elevated text-lg">
        {event.authorEmoji || "💻"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="font-semibold text-text-primary">{event.authorName}</h3>
          <span className="text-xs text-text-muted">{formatTime(event.createdAt)}</span>
        </div>
        {isText ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">{event.text}</p>
        ) : (
          <div className="rounded-md border border-border/70 bg-bg-surface p-3">
            <p className="mb-2 text-sm font-semibold text-text-primary">Shared a file</p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <File size={15} className="text-accent" />
              <span className="min-w-0 flex-1 truncate">{event.fileName ?? "File"}</span>
              <span className="shrink-0 text-xs text-text-muted">{formatBytes(event.fileSize ?? 0)}</span>
            </div>
            {event.filePath && (
              <div className="mt-3 flex justify-end">
                <button type="button" className="secondary-button min-h-8 px-3 py-1 text-xs" onClick={onOpen}>
                  <ExternalLink size={14} />
                  Open
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
