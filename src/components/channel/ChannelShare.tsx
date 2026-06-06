import {
  Check,
  Download,
  ExternalLink,
  File,
  FolderOpen,
  Hash,
  Paperclip,
  Pencil,
  RefreshCw,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShareChannel } from "../../data/channels";
import { useChannelStore } from "../../store/channelStore";
import type {
  ChannelEvent,
  DeviceInfo,
  SelectedFile,
  TransferProgress as Progress,
} from "../../types";
import { formatBytes, formatTime } from "../../utils/formatUtils";
import { DeviceAvatar } from "../devices/DeviceAvatar";
import { TransferProgress } from "../transfer/TransferProgress";

function renderMessageContent(
  text: string,
  devices: DeviceInfo[],
  localDevice: DeviceInfo,
  onMentionClick: (device: DeviceInfo) => void,
) {
  if (!text) return null;
  const names = [localDevice, ...devices].map((d) => d.name);
  if (names.length === 0) return text;

  const escapedNames = names
    .map((n) => n.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");
  const mentionRegex = new RegExp(`@(${escapedNames})\\b`, "g");

  const parts = [];
  let lastIndex = 0;
  let match;

  mentionRegex.lastIndex = 0;

  while ((match = mentionRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const name = match[1];

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    const device = [localDevice, ...devices].find((d) => d.name === name);
    const isMe = device?.id === localDevice.id;

    parts.push(
      <button
        key={matchIndex}
        type="button"
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold hover:underline cursor-pointer transition-colors ${
          isMe
            ? "bg-warning/20 text-warning hover:bg-warning/30"
            : "bg-accent/15 text-accent hover:bg-accent/25"
        }`}
        onClick={() => device && onMentionClick(device)}
      >
        @{name}
      </button>,
    );

    lastIndex = mentionRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

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
  onOpenDM?: (device: DeviceInfo) => void;
  onToggleFavorite?: (device: DeviceInfo) => void;
}

export function ChannelShare(props: Props) {
  const [message, setMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [activeProfileDevice, setActiveProfileDevice] =
    useState<DeviceInfo | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelEvents = useChannelStore((state) => state.events);

  const handleToggleFavorite = (device: DeviceInfo) => {
    if (props.onToggleFavorite) {
      props.onToggleFavorite(device);
      setActiveProfileDevice((prev) =>
        prev && prev.id === device.id
          ? { ...prev, isFavorite: !prev.isFavorite }
          : prev,
      );
    }
  };

  const mentionCandidates = useMemo(() => {
    const list = [props.localDevice, ...props.devices];
    if (!mentionQuery) return list;
    return list.filter((device) =>
      device.name.toLowerCase().includes(mentionQuery.toLowerCase()),
    );
  }, [props.devices, props.localDevice, mentionQuery]);

  const insertMention = (device: DeviceInfo) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeMention = message.slice(0, mentionStartIndex);
    const afterMention = message.slice(textarea.selectionEnd);
    const mentionText = `@${device.name} `;
    const newText = beforeMention + mentionText + afterMention;

    setMessage(newText);
    setShowMentionDropdown(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeMention.length + mentionText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };
  const events = useMemo(
    () =>
      channelEvents.filter(
        (item) => item.channelId === props.channel.id && !item.deletedAt,
      ),
    [channelEvents, props.channel.id],
  );
  const latestEventId =
    events.length > 0 ? events[events.length - 1].id : undefined;
  const totalSize = props.files.reduce((sum, item) => sum + item.file.size, 0);
  const canSend =
    (message.trim().length > 0 || props.files.length > 0) &&
    props.devices.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [latestEventId, props.channel.id]);

  const submitMessage = () => {
    const text = message.trim();
    if (text) {
      props.onSendMessage(text);
      setMessage("");
    }
    if (props.files.length > 0) {
      props.onSendFiles();
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] overflow-hidden">
      <section className="grid h-full min-h-0 min-w-0 grid-rows-[5rem_minmax(0,1fr)_auto] overflow-hidden border-r border-border/60">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-border/60 px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <props.channel.icon size={22} className="text-accent" />
              <h2 className="truncate text-2xl font-bold text-text-primary">
                # {props.channel.name}
              </h2>
            </div>
            <p className="mt-1 truncate text-sm text-text-muted">
              {props.channel.description}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-bg-surface px-3 py-2 text-sm text-text-secondary">
            <Users size={16} />
            {props.devices.length} online · {props.channel.messageCount} item
            {props.channel.messageCount === 1 ? "" : "s"}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {events.length === 0 ? (
            <div className="grid h-full place-items-center">
              <div className="max-w-sm text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-border bg-bg-surface text-accent">
                  <Hash size={28} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  Start sharing in #{props.channel.name}
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Messages and assets sent here are delivered to everyone
                  currently online on this Wi-Fi.
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
                  devices={props.devices}
                  localDevice={props.localDevice}
                  onMentionClick={(device) => setActiveProfileDevice(device)}
                  onDelete={() => props.onDeleteEvent(item.id)}
                  onEdit={(text) => props.onEditMessage(item.id, text)}
                  onDownload={() => props.onDownloadAsset(item.id)}
                  onOpen={() =>
                    item.filePath && props.onOpenAsset(item.filePath)
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <footer className="z-10 border-t border-border/60 bg-bg-primary p-4">
          {props.transferError && (
            <p className="mb-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
              {props.transferError}
            </p>
          )}

          <div className="relative rounded-md border border-border/80 bg-bg-surface p-2">
            {showMentionDropdown && mentionCandidates.length > 0 && (
              <div className="absolute bottom-full left-4 mb-2 z-50 max-h-48 w-56 overflow-y-auto rounded-md border border-border bg-bg-surface p-1 shadow-lg backdrop-blur-md">
                <p className="px-2 py-1 text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Teammates
                </p>
                {mentionCandidates.map((device, idx) => (
                  <button
                    key={device.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                      idx === selectedMentionIndex
                        ? "bg-accent text-white"
                        : "text-text-secondary hover:bg-bg-elevated"
                    }`}
                    onClick={() => insertMention(device)}
                  >
                    <span className="text-sm">{device.emoji || "💻"}</span>
                    <span className="font-medium truncate">{device.name}</span>
                  </button>
                ))}
              </div>
            )}
            {props.files.length > 0 && (
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/50 pb-2 px-1 min-w-0">
                <div className="flex gap-2 overflow-x-auto flex-1 min-w-0">
                  {props.files.map((item) => (
                    <div
                      key={item.id}
                      className="flex max-w-44 shrink-0 items-center gap-2 rounded-md border border-border/50 bg-bg-elevated px-2 py-1"
                    >
                      <File size={14} className="shrink-0 text-accent" />
                      <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
                        {item.file.name}
                      </span>
                      <button
                        type="button"
                        className="text-text-muted hover:text-error"
                        onClick={() => props.onRemoveFile(item.id)}
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="plain-icon-button p-1 text-text-muted hover:text-text-primary"
                  onClick={props.onClearFiles}
                  title="Clear assets"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) => {
                const val = event.target.value;
                const selectionStart = event.target.selectionStart;
                setMessage(val);

                const textBeforeCursor = val.slice(0, selectionStart);
                const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);

                if (lastWordMatch) {
                  setMentionQuery(lastWordMatch[1]);
                  setMentionStartIndex(
                    textBeforeCursor.length - lastWordMatch[0].length,
                  );
                  setShowMentionDropdown(true);
                  setSelectedMentionIndex(0);
                } else {
                  setShowMentionDropdown(false);
                  setMentionQuery("");
                }
              }}
              onKeyDown={(event) => {
                if (showMentionDropdown && mentionCandidates.length > 0) {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setSelectedMentionIndex(
                      (prev) => (prev + 1) % mentionCandidates.length,
                    );
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setSelectedMentionIndex(
                      (prev) =>
                        (prev - 1 + mentionCandidates.length) %
                        mentionCandidates.length,
                    );
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    insertMention(mentionCandidates[selectedMentionIndex]);
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setShowMentionDropdown(false);
                    return;
                  }
                }

                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend) submitMessage();
                }
              }}
              placeholder={`Message #${props.channel.name}`}
              className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="icon-button"
                  onClick={props.onPickFiles}
                  title="Attach files"
                >
                  <Paperclip size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={props.onPickFolder}
                  title="Attach folder"
                >
                  <FolderOpen size={17} />
                </button>
                <button type="button" className="icon-button" title="Emoji">
                  <Smile size={17} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="primary-button"
                  disabled={!canSend}
                  onClick={submitMessage}
                >
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
            <p className="text-xs text-text-muted">
              Everyone online receives channel shares.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={props.onRefresh}
            title="Refresh members"
          >
            <RefreshCw
              size={16}
              className={props.loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {props.error && (
          <p className="mb-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            {props.error}
          </p>
        )}

        <div className="space-y-2">
          <MemberRow device={props.localDevice} label="You" />
          {props.devices.map((device) => (
            <MemberRow key={device.id} device={device} label="Online" />
          ))}
        </div>

        {props.channel.lastNameChanges.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <h3 className="font-semibold text-text-primary">
              Recent name changes
            </h3>
            <div className="mt-3 space-y-2">
              {props.channel.lastNameChanges.slice(0, 5).map((change) => (
                <div
                  key={`${change.changedAt}:${change.previousName}:${change.newName}`}
                  className="rounded-md border border-border/50 bg-bg-surface p-3 text-xs text-text-secondary"
                >
                  <p className="truncate">
                    #{change.previousName} -&gt; #{change.newName}
                  </p>
                  <p className="mt-1 truncate text-text-muted">
                    {change.changedByName} · {formatTime(change.changedAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {activeProfileDevice && (
        <div
          className="fixed inset-0 z-[110] grid place-items-center bg-bg-primary/70 backdrop-blur-sm p-4"
          onClick={() => setActiveProfileDevice(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl border border-border/60 bg-bg-secondary shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-24 bg-gradient-to-r from-accent to-accent-hover relative">
              <button
                type="button"
                className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                onClick={() => setActiveProfileDevice(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pb-6 relative">
              <div className="absolute -top-10 left-6 h-20 w-20 rounded-full bg-bg-secondary border-4 border-bg-secondary flex items-center justify-center text-4xl shadow-md">
                {activeProfileDevice.emoji || "💻"}
              </div>

              <div className="pt-12">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-text-primary">
                    {activeProfileDevice.name}
                  </h3>
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-success"
                    title="Online"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-semibold">
                  {activeProfileDevice.deviceType || "desktop"} user
                </p>

                <div className="mt-4 border-t border-border/50 pt-4 space-y-3 text-sm text-text-secondary">
                  <div className="flex justify-between">
                    <span className="text-text-muted">IP Address</span>
                    <span className="font-mono text-xs">
                      {activeProfileDevice.ip}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Port</span>
                    <span className="font-mono text-xs">
                      {activeProfileDevice.port}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Status</span>
                    <span className="text-success font-medium">Active</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  {activeProfileDevice.id !== props.localDevice.id &&
                    props.onOpenDM && (
                      <button
                        type="button"
                        className="primary-button flex-1 justify-center py-2 text-xs font-semibold"
                        onClick={() => {
                          setActiveProfileDevice(null);
                          props.onOpenDM && props.onOpenDM(activeProfileDevice);
                        }}
                      >
                        Message
                      </button>
                    )}
                  <button
                    type="button"
                    className="secondary-button flex-1 justify-center py-2 text-xs font-semibold"
                    onClick={() => handleToggleFavorite(activeProfileDevice)}
                  >
                    {activeProfileDevice.isFavorite ? "Unstar" : "Star"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelMessageItem({
  event,
  mine,
  devices,
  localDevice,
  onMentionClick,
  onDelete,
  onEdit,
  onDownload,
  onOpen,
}: {
  event: ChannelEvent;
  mine: boolean;
  devices: DeviceInfo[];
  localDevice: DeviceInfo;
  onMentionClick: (device: DeviceInfo) => void;
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
          <h3 className="font-semibold text-text-primary">
            {event.authorName}
          </h3>
          <span className="text-xs text-text-muted">
            {formatTime(event.createdAt)}
          </span>
          {edited && <span className="text-xs text-text-muted">edited</span>}
          {mine && (
            <span className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
              {isText && (
                <button
                  type="button"
                  className="text-text-muted hover:text-accent"
                  onClick={() => setEditing(true)}
                  title="Edit message"
                >
                  <Pencil size={13} />
                </button>
              )}
              <button
                type="button"
                className="text-xs text-text-muted transition hover:text-error"
                onClick={onDelete}
              >
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
              <button
                type="button"
                className="secondary-button min-h-8 px-3 py-1 text-xs"
                onClick={() => {
                  setDraft(event.text ?? "");
                  setEditing(false);
                }}
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                className="primary-button min-h-8 px-3 py-1 text-xs"
                onClick={saveEdit}
              >
                <Check size={14} />
                Save
              </button>
            </div>
          </div>
        ) : isText ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
            {renderMessageContent(
              event.text ?? "",
              devices,
              localDevice,
              onMentionClick,
            )}
          </p>
        ) : (
          <div className="rounded-md border border-border/70 bg-bg-surface p-3">
            <p className="mb-2 text-sm font-semibold text-text-primary">
              Shared an asset · available on {event.availableCount} member
              {event.availableCount === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <File size={15} className="text-accent" />
              <span className="min-w-0 flex-1 truncate">
                {event.fileName ?? "Asset"}
              </span>
              <span className="shrink-0 text-xs text-text-muted">
                {formatBytes(event.fileSize ?? 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              {event.filePath && (
                <button
                  type="button"
                  className="secondary-button min-h-8 px-3 py-1 text-xs"
                  onClick={onOpen}
                >
                  <ExternalLink size={14} />
                  Open
                </button>
              )}
              <button
                type="button"
                className="primary-button min-h-8 px-3 py-1 text-xs"
                onClick={onDownload}
              >
                <Download size={14} />
                Download
              </button>
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
        <p className="truncate text-sm font-semibold text-text-primary">
          {device.name}
        </p>
        <p className="truncate text-xs text-text-muted">{label}</p>
      </div>
      <span className="h-2 w-2 rounded-full bg-success" />
    </div>
  );
}
