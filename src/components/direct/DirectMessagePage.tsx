import {
  File,
  FolderOpen,
  Paperclip,
  RefreshCw,
  Send,
  X,
  ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import type {
  DeviceInfo,
  DirectMessageEvent,
  SelectedFile,
  TransferProgress as Progress,
} from "../../types";
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
  sending?: boolean;
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
  onToggleFavorite?: (device: DeviceInfo) => void;
}

export function DirectMessagePage(props: Props) {
  const [message, setMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [activeProfileDevice, setActiveProfileDevice] =
    useState<DeviceInfo | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const list = props.device
      ? [props.localDevice, props.device]
      : [props.localDevice];
    if (!mentionQuery) return list;
    return list.filter((device) =>
      device.name.toLowerCase().includes(mentionQuery.toLowerCase()),
    );
  }, [props.device, props.localDevice, mentionQuery]);

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
  const visibleEvents = useMemo(
    () => props.events.filter((event) => !event.deletedAt),
    [props.events],
  );
  const latestEventId =
    visibleEvents.length > 0
      ? visibleEvents[visibleEvents.length - 1].id
      : undefined;
  const totalSize = props.files.reduce((sum, item) => sum + item.file.size, 0);
  const canSend = Boolean(
    props.device && (message.trim() || props.files.length),
  );

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    }
  }, [latestEventId, props.device?.id]);

  const submitMessage = () => {
    const text = message.trim();
    if (text && props.device) {
      props.onSendText(props.device, text);
      setMessage("");
    }
    if (props.files.length > 0 && props.device) {
      props.onSendFiles(props.device);
    }
  };

  if (!props.device) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-border bg-bg-surface text-accent">
            <Send size={26} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-text-primary">
            Choose a member
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Pick someone from the left panel to start a direct message.
          </p>
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
            <h2 className="truncate text-2xl font-bold text-text-primary">
              {props.device.name}
            </h2>
            <p className="truncate text-sm text-text-muted">
              {props.device.ip} · online on this network
            </p>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={props.onRefresh}
          title="Refresh direct messages"
        >
          <RefreshCw
            size={16}
            className={props.loading ? "animate-spin" : ""}
          />
        </button>
      </header>

      <div className="min-h-0 overflow-y-auto px-6 py-5">
        {visibleEvents.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="max-w-sm text-center">
              <h3 className="text-lg font-semibold text-text-primary">
                No direct messages yet
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Send a message or share files with {props.device.name}.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleEvents.map((event) => (
              <DirectMessageItem
                key={event.id}
                event={event}
                mine={event.authorId === props.localDevice.id}
                devices={props.device ? [props.device] : []}
                localDevice={props.localDevice}
                onMentionClick={(device) => setActiveProfileDevice(device)}
                onOpen={() =>
                  event.filePath && props.onOpenAsset(event.filePath)
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <footer className="border-t border-border/60 bg-bg-primary p-4">
        {(props.error || props.transferError) && (
          <p className="mb-3 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            {props.error ?? props.transferError}
          </p>
        )}

        <div
          className={`relative rounded-md border p-2 transition-colors ${props.sending ? "border-border/40 bg-bg-surface/50 opacity-60" : "border-border/80 bg-bg-surface"}`}
        >
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
                title="Clear files"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            disabled={props.sending}
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
            placeholder={
              props.sending ? "Sending files…" : `Message ${props.device.name}`
            }
            className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="icon-button"
                disabled={props.sending}
                onClick={props.onPickFiles}
                title="Attach files"
              >
                <Paperclip size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={props.sending}
                onClick={props.onPickFolder}
                title="Attach folder"
              >
                <FolderOpen size={17} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="primary-button"
                disabled={!canSend || props.sending}
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
    </section>
  );
}

function DirectMessageItem({
  event,
  mine,
  devices,
  localDevice,
  onMentionClick,
  onOpen,
}: {
  event: DirectMessageEvent;
  mine: boolean;
  devices: DeviceInfo[];
  localDevice: DeviceInfo;
  onMentionClick: (device: DeviceInfo) => void;
  onOpen: () => void;
}) {
  const isText = String(event.kind).toLowerCase() === "text";
  return (
    <article className={`flex gap-3 ${mine ? "opacity-95" : ""}`}>
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
        </div>
        {isText ? (
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
              Shared a file
            </p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <File size={15} className="text-accent" />
              <span className="min-w-0 flex-1 truncate">
                {event.fileName ?? "File"}
              </span>
              <span className="shrink-0 text-xs text-text-muted">
                {formatBytes(event.fileSize ?? 0)}
              </span>
            </div>
            {event.filePath && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="secondary-button min-h-8 px-3 py-1 text-xs"
                  onClick={onOpen}
                >
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
