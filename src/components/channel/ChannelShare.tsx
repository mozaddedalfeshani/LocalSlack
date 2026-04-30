import { Check, Download, ExternalLink, File, FolderOpen, Hash, Paperclip, Pencil, RefreshCw, Send, Smile, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ShareChannel } from "../../data/channels";
import { useChannelStore } from "../../store/channelStore";
import type { ChannelEvent, DeviceInfo, SelectedFile, TransferProgress as Progress } from "../../types";
import { formatBytes, formatTime } from "../../utils/formatUtils";
import { DeviceAvatar } from "../devices/DeviceAvatar";
import { TransferProgress } from "../transfer/TransferProgress";

interface Props {
  channel: ShareChannel;
  localDevice: DeviceInfo;
  devices: DeviceInfo[];
  loading?: boolean;
  error?: string;
  files: SelectedFile[];
  progress: Progress[];
  transferError?: string;
  onRefresh: () => void;
  onPickFiles: () => void;
  onPickFolder: () => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onSendFiles: () => void;
  onSendMessage: (text: string) => void;
  onDeleteEvent: (id: string) => void;
  onEditMessage: (id: string, text: string) => void;
  onDownloadAsset: (id: string) => void;
  onOpenAsset: (path: string) => void;
  onCancel: (sessionId: string) => void;
}

export function ChannelShare(props: Props) {
  const [message, setMessage] = useState("");
  const channelEvents = useChannelStore((state) => state.events);
  const events = useMemo(
    () => channelEvents.filter((item) => item.channelId === props.channel.id && !item.deletedAt),
    [channelEvents, props.channel.id]
  );
  const totalSize = props.files.reduce((sum, item) => sum + item.file.size, 0);
  const canSendMessage = message.trim().length > 0 && props.devices.length > 0;
  const canSendFiles = props.files.length > 0 && props.devices.length > 0;

  const submitMessage = () => {
    const text = message.trim();
    if (!text) return;
    props.onSendMessage(text);
    setMessage("");
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_280px] overflow-hidden">
      <section className="flex min-w-0 flex-col border-r border-border/60">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-border/60 px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <props.channel.icon size={22} className="text-accent" />
              <h2 className="truncate text-2xl font-bold text-text-primary"># {props.channel.name}</h2>
            </div>
            <p className="mt-1 truncate text-sm text-text-muted">{props.channel.description}</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-bg-surface px-3 py-2 text-sm text-text-secondary">
            <Users size={16} />
            {props.devices.length} online
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {events.length === 0 ? (
            <div className="grid h-full place-items-center">
              <div className="max-w-sm text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-border bg-bg-surface text-accent">
                  <Hash size={28} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">Start sharing in #{props.channel.name}</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Messages and assets sent here are delivered to everyone currently online on this Wi-Fi.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((item) => (
                <ChannelMessageItem
                  key={item.id}
                  event={item}
                  mine={item.authorId === props.localDevice.id}
                  onDelete={() => props.onDeleteEvent(item.id)}
                  onEdit={(text) => props.onEditMessage(item.id, text)}
                  onDownload={() => props.onDownloadAsset(item.id)}
                  onOpen={() => item.filePath && props.onOpenAsset(item.filePath)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-border/60 bg-bg-primary p-4">
          {props.files.length > 0 && (
            <div className="mb-3 rounded-md border border-border/70 bg-bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">
                  {props.files.length} asset{props.files.length === 1 ? "" : "s"} ready · {formatBytes(totalSize)}
                </p>
                <button type="button" className="plain-icon-button" onClick={props.onClearFiles} title="Clear assets">
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

          {props.transferError && (
            <p className="mb-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{props.transferError}</p>
          )}

          <div className="rounded-md border border-border/80 bg-bg-surface p-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSendMessage) submitMessage();
                }
              }}
              placeholder={`Message #${props.channel.name}`}
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
                <button type="button" className="icon-button" title="Emoji">
                  <Smile size={17} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="secondary-button" disabled={!canSendFiles} onClick={props.onSendFiles}>
                  <File size={16} />
                  Share assets
                </button>
                <button type="button" className="primary-button" disabled={!canSendMessage} onClick={submitMessage}>
                  <Send size={16} />
                  Send
                </button>
              </div>
            </div>
          </div>

          <TransferProgress items={props.progress} onCancel={props.onCancel} />
        </footer>
      </section>

      <aside className="min-h-0 overflow-y-auto bg-bg-secondary p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">Channel members</h3>
            <p className="text-xs text-text-muted">Everyone online receives channel shares.</p>
          </div>
          <button type="button" className="icon-button" onClick={props.onRefresh} title="Refresh members">
            <RefreshCw size={16} className={props.loading ? "animate-spin" : ""} />
          </button>
        </div>

        {props.error && <p className="mb-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{props.error}</p>}

        <div className="space-y-2">
          <MemberRow device={props.localDevice} label="You" />
          {props.devices.map((device) => (
            <MemberRow key={device.id} device={device} label="Online" />
          ))}
        </div>
      </aside>
    </div>
  );
}

function ChannelMessageItem({
  event,
  mine,
  onDelete,
  onEdit,
  onDownload,
  onOpen,
}: {
  event: ChannelEvent;
  mine: boolean;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onDownload: () => void;
  onOpen: () => void;
}) {
  const isText = String(event.kind).toLowerCase() === "text";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(event.text ?? "");
  const edited = isText && event.updatedAt > event.createdAt;
  const saveEdit = () => {
    const text = draft.trim();
    if (!text) return;
    onEdit(text);
    setEditing(false);
  };
  return (
    <article className={`group flex gap-3 ${mine ? "opacity-95" : ""}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-bg-elevated text-lg">
        {event.authorEmoji || "💻"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="font-semibold text-text-primary">{event.authorName}</h3>
          <span className="text-xs text-text-muted">{formatTime(event.createdAt)}</span>
          {edited && <span className="text-xs text-text-muted">edited</span>}
          {mine && (
            <span className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
              {isText && (
                <button type="button" className="text-text-muted hover:text-accent" onClick={() => setEditing(true)} title="Edit message">
                  <Pencil size={13} />
                </button>
              )}
              <button type="button" className="text-xs text-text-muted transition hover:text-error" onClick={onDelete}>
                Delete
              </button>
            </span>
          )}
        </div>
        {isText && editing ? (
          <div className="rounded-md border border-border/70 bg-bg-surface p-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-20 w-full resize-none bg-transparent text-sm text-text-primary outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="secondary-button min-h-8 px-3 py-1 text-xs" onClick={() => { setDraft(event.text ?? ""); setEditing(false); }}>
                <X size={14} />
                Cancel
              </button>
              <button type="button" className="primary-button min-h-8 px-3 py-1 text-xs" onClick={saveEdit}>
                <Check size={14} />
                Save
              </button>
            </div>
          </div>
        ) : isText ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">{event.text}</p>
        ) : (
          <div className="rounded-md border border-border/70 bg-bg-surface p-3">
            <p className="mb-2 text-sm font-semibold text-text-primary">
              Shared an asset · available on {event.availableCount} member{event.availableCount === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <File size={15} className="text-accent" />
              <span className="min-w-0 flex-1 truncate">{event.fileName ?? "Asset"}</span>
              <span className="shrink-0 text-xs text-text-muted">{formatBytes(event.fileSize ?? 0)}</span>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {event.filePath ? (
                <button type="button" className="secondary-button min-h-8 px-3 py-1 text-xs" onClick={onOpen}>
                  <ExternalLink size={14} />
                  Open
                </button>
              ) : (
                <button type="button" className="primary-button min-h-8 px-3 py-1 text-xs" onClick={onDownload}>
                  <Download size={14} />
                  Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function MemberRow({ device, label }: { device: DeviceInfo; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 bg-bg-surface p-3">
      <DeviceAvatar device={device} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{device.name}</p>
        <p className="truncate text-xs text-text-muted">{label}</p>
      </div>
      <span className="h-2 w-2 rounded-full bg-success" />
    </div>
  );
}
