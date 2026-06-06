import {
  Bookmark,
  Check,
  Copy,
  Download,
  ExternalLink,
  File,
  FolderOpen,
  Forward,
  Hash,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  RefreshCw,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, memo, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { ShareChannel } from "../../data/channels";
import { useChannelStore } from "../../store/channelStore";
import type {
  ChannelEvent,
  DeviceInfo,
  SelectedFile,
  TransferProgress as Progress,
} from "../../types";
import { formatBytes, formatTime } from "../../utils/formatUtils";
import { isImageFileName } from "../../utils/fileUtils";
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
  onSendFiles: (parentId?: string) => void;
  onSendMessage: (text: string, parentId?: string) => void;
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

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadReplyText, setThreadReplyText] = useState("");
  const [showMemberSidebar, setShowMemberSidebar] = useState(true);
  const [threadWidth, setThreadWidth] = useState(380);

  // Refs used for zero-React-overhead drag resize
  const threadWidthRef = useRef(380);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(380);
  const containerRef = useRef<HTMLDivElement>(null);
  const threadPanelRef = useRef<HTMLElement>(null);
  const showMemberSidebarRef = useRef(showMemberSidebar);
  useEffect(() => { showMemberSidebarRef.current = showMemberSidebar; }, [showMemberSidebar]);

  // Attach global drag listeners once (never re-created)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = resizeStartX.current - e.clientX;
      const next = Math.min(700, Math.max(260, resizeStartWidth.current + delta));
      threadWidthRef.current = next;
      // Direct DOM mutation — no React render overhead
      if (threadPanelRef.current) {
        threadPanelRef.current.style.width = `${next}px`;
      }
      if (containerRef.current) {
        const memberCol = showMemberSidebarRef.current ? " 280px" : "";
        containerRef.current.style.gridTemplateColumns =
          `minmax(0,1fr) ${next}px${memberCol}`;
      }
    };
    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Re-enable transition, then sync React state (single re-render)
      if (containerRef.current) {
        containerRef.current.style.transition = "";
      }
      setThreadWidth(threadWidthRef.current);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = threadWidthRef.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    // Kill transition during drag so it doesn't lag behind the cursor
    if (containerRef.current) {
      containerRef.current.style.transition = "none";
    }
  }, []);

  // helper: open thread → close member sidebar
  const openThread = (id: string) => {
    setActiveThreadId(id);
    setShowMemberSidebar(false);
  };

  // helper: close thread
  const closeThread = () => {
    setActiveThreadId(null);
  };

  const activeThreadParent = useMemo(() => {
    if (!activeThreadId) return null;
    return channelEvents.find((item) => item.id === activeThreadId) ?? null;
  }, [channelEvents, activeThreadId]);

  const replies = useMemo(() => {
    if (!activeThreadId) return [];
    return channelEvents.filter(
      (item) =>
        item.channelId === props.channel.id &&
        item.parentId === activeThreadId &&
        !item.deletedAt,
    );
  }, [channelEvents, props.channel.id, activeThreadId]);

  const submitThreadReply = () => {
    if (!activeThreadId) return;
    const text = threadReplyText.trim();
    if (text) {
      props.onSendMessage(text, activeThreadId);
      setThreadReplyText("");
    }
    if (props.files.length > 0) {
      props.onSendFiles(activeThreadId);
    }
  };

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
        (item) =>
          item.channelId === props.channel.id &&
          !item.deletedAt &&
          !item.parentId,
      ),
    [channelEvents, props.channel.id],
  );
  const latestEventId =
    events.length > 0 ? events[events.length - 1].id : undefined;
  const canSend =
    (message.trim().length > 0 || props.files.length > 0) &&
    props.devices.length > 0;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    }
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

  // Derive grid layout: main | [thread Xpx] | [members 280px]
  const gridCols = (() => {
    const cols = ["minmax(0,1fr)"];
    if (activeThreadParent) cols.push(`${threadWidth}px`);
    if (showMemberSidebar) cols.push("280px");
    return cols.join(" ");
  })();

  return (
    <div
      ref={containerRef}
      className="grid h-full min-h-0 overflow-hidden transition-[grid-template-columns] duration-200"
      style={{ gridTemplateColumns: gridCols }}
    >
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
          <button
            type="button"
            onClick={() => setShowMemberSidebar((v) => !v)}
            title={showMemberSidebar ? "Hide members" : "Show members"}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${
              showMemberSidebar
                ? "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20"
                : "border-border/70 bg-bg-surface text-text-secondary hover:bg-bg-elevated"
            }`}
          >
            <Users size={16} />
            {props.devices.length} online · {props.channel.messageCount} item
            {props.channel.messageCount === 1 ? "" : "s"}
          </button>
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
              {events.map((item) => {
                const threadReplies = channelEvents.filter(
                  (reply) => reply.parentId === item.id && !reply.deletedAt,
                );
                return (
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
                    onThreadReply={() => openThread(item.id)}
                    repliesCount={threadReplies.length}
                  />
                );
              })}
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
                <div className="flex gap-3 overflow-x-auto flex-1 min-w-0 py-1 scrollbar-thin scrollbar-thumb-border">
                  {props.files.map((item) => (
                    <div
                      key={item.id}
                      className="relative w-16 h-16 rounded-xl border border-border bg-bg-elevated overflow-hidden shrink-0 group flex items-center justify-center shadow-sm"
                    >
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-1.5 text-center w-full h-full">
                          <File size={20} className="text-accent mb-0.5" />
                          <span className="text-[9px] text-text-secondary truncate w-full px-0.5">
                            {item.file.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Delete Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <button
                          type="button"
                          className="p-1 rounded-full bg-error text-white hover:bg-error hover:scale-110 transition-all cursor-pointer"
                          onClick={() => props.onRemoveFile(item.id)}
                          title="Remove file"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="plain-icon-button p-1 text-text-muted hover:text-text-primary self-center"
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

      {activeThreadParent && (
        <aside
          ref={threadPanelRef as React.RefObject<HTMLDivElement>}
          className="relative flex h-full min-h-0 flex-col border-r border-border/60 bg-bg-secondary overflow-hidden"
          style={{ width: threadWidth, minWidth: 260, maxWidth: 700 }}
        >
          {/* ── Resize Handle (left edge) ── */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute left-0 top-0 z-30 h-full w-2 cursor-col-resize hover:bg-accent/20 active:bg-accent/30 transition-colors"
            title="Drag to resize"
          />
          {/* Header */}
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-border/60 px-4">
            <div>
              <h3 className="text-base font-bold text-text-primary">Thread</h3>
              <p className="text-xs text-text-muted"># {props.channel.name}</p>
            </div>
            <button
              type="button"
              className="icon-button p-1 hover:bg-bg-elevated rounded-md"
              onClick={() => closeThread()}
            >
              <X size={18} />
            </button>
          </div>

          {/* Thread Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Parent Message */}
            <div className="pb-4 border-b border-border/40">
              <ChannelMessageItem
                event={activeThreadParent}
                mine={activeThreadParent.authorId === props.localDevice.id}
                devices={props.devices}
                localDevice={props.localDevice}
                onMentionClick={(device) => setActiveProfileDevice(device)}
                onDelete={() => props.onDeleteEvent(activeThreadParent.id)}
                onEdit={(text) => props.onEditMessage(activeThreadParent.id, text)}
                onDownload={() => props.onDownloadAsset(activeThreadParent.id)}
                onOpen={() =>
                  activeThreadParent.filePath && props.onOpenAsset(activeThreadParent.filePath)
                }
                hideReplyButton={true}
              />
            </div>

            {/* Replies Header */}
            {replies.length > 0 && (
              <div className="flex items-center gap-2 py-1 text-2xs font-semibold text-text-muted uppercase tracking-wider">
                <MessageSquare size={12} />
                <span>
                  {replies.length === 1 ? "1 reply" : `${replies.length} replies`}
                </span>
              </div>
            )}

            {/* Replies List */}
            <div className="space-y-4">
              {replies.map((reply) => (
                <ChannelMessageItem
                  key={reply.id}
                  event={reply}
                  mine={reply.authorId === props.localDevice.id}
                  devices={props.devices}
                  localDevice={props.localDevice}
                  onMentionClick={(device) => setActiveProfileDevice(device)}
                  onDelete={() => props.onDeleteEvent(reply.id)}
                  onEdit={(text) => props.onEditMessage(reply.id, text)}
                  onDownload={() => props.onDownloadAsset(reply.id)}
                  onOpen={() =>
                    reply.filePath && props.onOpenAsset(reply.filePath)
                  }
                  hideReplyButton={true}
                />
              ))}
            </div>
          </div>

          {/* Reply Input Box */}
          <div className="border-t border-border/60 bg-bg-primary p-3">
            <div className="relative rounded-md border border-border/80 bg-bg-surface p-2">
              {props.files.length > 0 && (
                <div className="mb-2 flex items-center justify-between gap-3 border-b border-border/50 pb-2 px-1 min-w-0">
                  <div className="flex gap-3 overflow-x-auto flex-1 min-w-0 py-1 scrollbar-thin scrollbar-thumb-border">
                    {props.files.map((item) => (
                      <div
                        key={item.id}
                        className="relative w-12 h-12 rounded-lg border border-border bg-bg-elevated overflow-hidden shrink-0 group flex items-center justify-center shadow-sm"
                      >
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full">
                            <File size={16} className="text-accent mb-0.5" />
                            <span className="text-[8px] text-text-secondary truncate w-full px-0.5">
                              {item.file.name}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                          <button
                            type="button"
                            className="p-0.5 rounded-full bg-error text-white hover:bg-error hover:scale-110 transition-all cursor-pointer"
                            onClick={() => props.onRemoveFile(item.id)}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <textarea
                value={threadReplyText}
                onChange={(e) => setThreadReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (threadReplyText.trim() || props.files.length > 0) {
                      submitThreadReply();
                    }
                  }
                }}
                placeholder="Reply in thread..."
                className="min-h-12 w-full resize-none bg-transparent px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="icon-button p-1"
                    onClick={props.onPickFiles}
                    title="Attach files"
                  >
                    <Paperclip size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button p-1"
                    onClick={props.onPickFolder}
                    title="Attach folder"
                  >
                    <FolderOpen size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  className="primary-button py-1 px-2.5 text-xs"
                  disabled={!threadReplyText.trim() && props.files.length === 0}
                  onClick={submitThreadReply}
                >
                  <Send size={12} />
                  Reply
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {showMemberSidebar && (
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
      )}

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

const ChannelMessageItem = memo(function ChannelMessageItem({
  event,
  mine,
  devices,
  localDevice,
  onMentionClick,
  onDelete,
  onEdit,
  onDownload,
  onOpen,
  onThreadReply,
  repliesCount,
  hideReplyButton,
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
  onThreadReply?: () => void;
  repliesCount?: number;
  hideReplyButton?: boolean;
}) {
  const isText = String(event.kind).toLowerCase() === "text";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(event.text ?? "");
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [bookmarked, setBookmarked] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const edited = isText && event.updatedAt > event.createdAt;
  
  const saveEdit = () => {
    const text = draft.trim();
    if (!text) return;
    onEdit(text);
    setEditing(false);
  };

  const toggleReaction = (emoji: string) => {
    setReactions((prev) => {
      const next = { ...prev };
      if (next[emoji]) {
        next[emoji] -= 1;
        if (next[emoji] === 0) {
          delete next[emoji];
        }
      } else {
        next[emoji] = 1;
      }
      return next;
    });
  };

  const handleCopy = () => {
    const textToCopy = event.text || (event.fileName ? `File: ${event.fileName}` : "");
    if (textToCopy) {
      void navigator.clipboard.writeText(textToCopy);
      toast.success("Copied to clipboard");
    }
    setShowMoreMenu(false);
  };

  const handleShare = () => {
    const textToCopy = event.text || (event.fileName ? `Shared File: ${event.fileName}` : "");
    if (textToCopy) {
      void navigator.clipboard.writeText(textToCopy);
      toast.success("Message shared (copied to clipboard)");
    }
  };

  const handleBookmarkToggle = () => {
    setBookmarked(!bookmarked);
    toast.success(bookmarked ? "Bookmark removed" : "Message bookmarked");
  };

  const handleThreadClick = () => {
    if (onThreadReply) {
      onThreadReply();
    }
  };

  return (
    <article
      onMouseLeave={() => {
        setShowMoreMenu(false);
        setShowEmojiPicker(false);
      }}
      className={`group flex gap-3 ${mine ? "opacity-95" : ""} relative hover:bg-bg-elevated/20 p-3 rounded-2xl transition-all duration-150`}
    >
      {/* Floating Action Bar (Slack Style) */}
      <div className="absolute -top-4 right-6 z-20 hidden group-hover:flex items-center gap-0.5 rounded-lg border border-border bg-bg-surface p-1 shadow-md animate-in fade-in duration-150">
        {/* 1. ✅ Reaction */}
        <button
          type="button"
          className="h-7 w-7 rounded hover:bg-bg-elevated flex items-center justify-center text-sm transition cursor-pointer"
          onClick={() => toggleReaction("✅")}
          title="React with Checkmark"
        >
          ✅
        </button>

        {/* 2. 👀 Reaction */}
        <button
          type="button"
          className="h-7 w-7 rounded hover:bg-bg-elevated flex items-center justify-center text-sm transition cursor-pointer"
          onClick={() => toggleReaction("👀")}
          title="React with Eyes"
        >
          👀
        </button>

        {/* 3. 😍 Reaction */}
        <button
          type="button"
          className="h-7 w-7 rounded hover:bg-bg-elevated flex items-center justify-center text-sm transition cursor-pointer"
          onClick={() => toggleReaction("😍")}
          title="React with Heart Eyes"
        >
          😍
        </button>

        {/* 4. Add Reaction popover */}
        <div className="relative flex items-center">
          <button
            type="button"
            className="h-7 w-7 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition cursor-pointer"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowMoreMenu(false);
            }}
            title="Add reaction"
          >
            <Smile size={15} />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-30 flex gap-1 rounded-lg border border-border bg-bg-surface p-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
              {["👍", "🚀", "🎉", "😂", "😮", "😢"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="h-7 w-7 rounded hover:bg-bg-elevated flex items-center justify-center text-base transition cursor-pointer"
                  onClick={() => {
                    toggleReaction(emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Reply in thread */}
        {!hideReplyButton && (
          <button
            type="button"
            className="h-7 w-7 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition cursor-pointer"
            onClick={handleThreadClick}
            title="Reply in thread"
          >
            <MessageSquare size={14} />
          </button>
        )}

        {/* 6. Share message */}
        <button
          type="button"
          className="h-7 w-7 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition cursor-pointer"
          onClick={handleShare}
          title="Share message"
        >
          <Forward size={14} />
        </button>

        {/* 7. Bookmark */}
        <button
          type="button"
          className={`h-7 w-7 rounded hover:bg-bg-elevated flex items-center justify-center transition cursor-pointer ${
            bookmarked ? "text-amber-500" : "text-text-secondary hover:text-text-primary"
          }`}
          onClick={handleBookmarkToggle}
          title="Bookmark message"
        >
          <Bookmark size={14} fill={bookmarked ? "currentColor" : "none"} />
        </button>

        {/* 8. More actions dropdown */}
        <div className="relative flex items-center">
          <button
            type="button"
            className={`h-7 w-7 rounded hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition cursor-pointer ${
              showMoreMenu ? "bg-bg-elevated" : ""
            }`}
            onClick={() => {
              setShowMoreMenu(!showMoreMenu);
              setShowEmojiPicker(false);
            }}
            title="More actions"
          >
            <MoreVertical size={14} />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-lg border border-border bg-bg-surface p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
                onClick={handleCopy}
              >
                <Copy size={13} />
                Copy Text
              </button>

              {mine && isText && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
                  onClick={() => {
                    setEditing(true);
                    setShowMoreMenu(false);
                  }}
                >
                  <Pencil size={13} />
                  Edit Message
                </button>
              )}

              {/* Asset Specific actions inside dropdown */}
              {!isText && (
                <>
                  {event.filePath && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
                      onClick={() => {
                        onOpen();
                        setShowMoreMenu(false);
                      }}
                    >
                      <ExternalLink size={13} />
                      Open File
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
                    onClick={() => {
                      onDownload();
                      setShowMoreMenu(false);
                    }}
                  >
                    <Download size={13} />
                    Download File
                  </button>
                </>
              )}

              {mine && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-error hover:bg-error/10 transition-colors cursor-pointer border-t border-border/40 mt-1 pt-1.5"
                  onClick={() => {
                    onDelete();
                    setShowMoreMenu(false);
                  }}
                >
                  <Trash2 size={13} />
                  Delete Message
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
            
            {/* Inline Image Preview (Slack Style) */}
            {isImageFileName(event.fileName) && event.filePath && (
              <div className="mb-3 relative max-w-sm rounded-lg overflow-hidden border border-border bg-bg-elevated/30 group/img">
                <img
                  src={convertFileSrc(event.filePath)}
                  alt={event.fileName ?? "Shared image"}
                  className="max-h-60 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={onOpen}
                />
              </div>
            )}

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

        {/* Reaction pills row */}
        {Object.keys(reactions).length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-150">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(emoji)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/80 bg-bg-surface hover:bg-bg-elevated text-[11px] font-medium text-text-secondary transition duration-150 cursor-pointer"
              >
                <span>{emoji}</span>
                <span className="font-bold text-text-primary text-[10px]">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread replies bar */}
        {!hideReplyButton && repliesCount !== undefined && repliesCount > 0 && (
          <button
            type="button"
            onClick={handleThreadClick}
            className="mt-2 flex items-center gap-2 rounded-md border border-accent/20 bg-accent/5 hover:bg-accent/10 px-3 py-1 text-xs font-semibold text-accent transition duration-150 cursor-pointer w-fit"
          >
            <MessageSquare size={13} />
            <span>
              {repliesCount === 1 ? "1 reply" : `${repliesCount} replies`}
            </span>
          </button>
        )}
      </div>
    </article>
  );
});

const MemberRow = memo(function MemberRow({ device, label }: { device: DeviceInfo; label: string }) {
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
});
