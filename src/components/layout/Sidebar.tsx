import { invoke } from "@tauri-apps/api/core";
import {
  Check,
  Clock3,
  Github,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Star,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ShareChannel } from "../../data/channels";
import type { ChannelId, DeviceInfo } from "../../types";
import type { MainView } from "../../store/uiStore";
import { DeviceAvatar } from "../devices/DeviceAvatar";
import logo from "../../assets/logo.png";

interface Props {
  devices: DeviceInfo[];
  channels: ShareChannel[];
  selected?: DeviceInfo;
  loading?: boolean;
  error?: string;
  view: string;
  activeChannelId: ChannelId;
  activeDmDeviceId?: string;
  onView: (view: MainView) => void;
  onChannel: (channelId: ChannelId) => void;
  onDirectMessage: (device: DeviceInfo) => void;
  onRefreshDevices: () => void;
  onCreateChannel: (name: string) => void;
  onRenameChannel: (channelId: string, name: string) => void;
  onSelect: (device: DeviceInfo) => void;
  onToggleFavorite: (device: DeviceInfo) => void;
  onSettings: () => void;
}

type PromptState =
  | { kind: "create" }
  | { kind: "rename"; channelId: string; current: string };

export function Sidebar(props: Props) {
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setInputValue("");
    setPrompt({ kind: "create" });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const openRename = (channelId: string, current: string) => {
    setInputValue(current);
    setPrompt({ kind: "rename", channelId, current });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    const name = inputValue.trim();
    if (!name || !prompt) return;
    if (prompt.kind === "create") props.onCreateChannel(name);
    else props.onRenameChannel(prompt.channelId, name);
    setPrompt(null);
  };

  const cancel = () => setPrompt(null);

  const openGithubRepository = () => {
    void invoke("open_github_repository");
  };

  return (
    <aside className="flex w-[270px] shrink-0 flex-col border-r border-border/60 bg-bg-secondary/80 px-3 py-8 text-text-primary shadow-cute backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-3 px-5">
        <img
          src={logo}
          alt="LocalSlack Logo"
          className="h-10 w-10 rounded-lg object-cover shadow-sm"
        />
        <h1 className="font-display text-2xl font-bold tracking-normal">
          LocalSlack
        </h1>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Channels
          </p>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-text-muted transition hover:bg-bg-surface hover:text-accent"
            onClick={openCreate}
            title="Add channel"
          >
            <Plus size={16} />
          </button>
        </div>

        {prompt?.kind === "create" && (
          <ChannelNameInput
            ref={inputRef}
            value={inputValue}
            placeholder="channel-name"
            onChange={setInputValue}
            onCommit={commit}
            onCancel={cancel}
          />
        )}

        <nav className="space-y-1">
          {props.channels.map((channel) => {
            const Icon = channel.icon;
            const active =
              props.view === "channel" && props.activeChannelId === channel.id;
            const renaming =
              prompt?.kind === "rename" && prompt.channelId === channel.id;
            return (
              <div key={channel.id}>
                <div className={`rail-button ${active ? "active" : ""} pr-1`}>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => props.onChannel(channel.id)}
                  >
                    <span className="rail-icon">
                      <Icon size={21} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      # {channel.name}
                    </span>
                    <span className="text-xs text-text-muted">
                      {channel.messageCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-bg-elevated hover:text-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRename(channel.id, channel.name);
                    }}
                    title="Rename channel"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                {renaming && (
                  <ChannelNameInput
                    ref={inputRef}
                    value={inputValue}
                    placeholder={channel.name}
                    onChange={setInputValue}
                    onCommit={commit}
                    onCancel={cancel}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-2 flex items-center justify-between px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Members
          </p>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-text-muted transition hover:bg-bg-surface hover:text-accent"
            onClick={props.onRefreshDevices}
            title="Refresh members"
          >
            <RefreshCw
              size={16}
              className={props.loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {props.error && (
          <p className="mx-4 mb-2 text-xs text-error">{props.error}</p>
        )}
        {props.devices.length === 0 ? (
          <p className="px-4 text-sm text-text-muted">
            No online members found.
          </p>
        ) : (
          <nav className="space-y-1 overflow-y-auto pr-1">
            {props.devices.map((device) => {
              const active =
                props.view === "dm" && props.activeDmDeviceId === device.id;
              return (
                <div
                  key={device.id}
                  className={`rail-button ${active ? "active" : ""} pr-1`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => props.onDirectMessage(device)}
                  >
                    <DeviceAvatar device={device} />
                    <span className="min-w-0 flex-1 truncate">
                      {device.name}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                  </button>
                  <button
                    type="button"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-bg-elevated hover:text-accent"
                    aria-label={
                      device.isFavorite ? "Remove favorite" : "Add favorite"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onToggleFavorite(device);
                    }}
                    title={
                      device.isFavorite ? "Remove favorite" : "Add favorite"
                    }
                  >
                    <Star
                      size={13}
                      fill={device.isFavorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              );
            })}
          </nav>
        )}
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          className={`rail-button ${props.view === "history" ? "active" : ""}`}
          onClick={() => props.onView("history")}
        >
          <span className="rail-icon">
            <Clock3 size={23} strokeWidth={2.2} />
          </span>
          <span>History</span>
        </button>
        <button
          type="button"
          className={`rail-button ${props.view === "settings" ? "active" : ""}`}
          onClick={() => props.onView("settings")}
        >
          <span className="rail-icon">
            <Settings size={23} strokeWidth={2.2} />
          </span>
          <span>Settings</span>
        </button>
        <button
          type="button"
          className="rail-button"
          onClick={openGithubRepository}
          title="Open GitHub repository"
        >
          <span className="rail-icon">
            <Github size={23} strokeWidth={2.2} />
          </span>
          <span>Contribute to app</span>
        </button>
      </div>
    </aside>
  );
}

import { forwardRef } from "react";

const ChannelNameInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
    onCommit: () => void;
    onCancel: () => void;
  }
>(function ChannelNameInput(
  { value, placeholder, onChange, onCommit, onCancel },
  ref,
) {
  return (
    <div className="mx-1 mb-1 rounded-lg border border-accent/40 bg-bg-surface p-2 shadow-sm">
      <input
        ref={ref}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
      <div className="mt-2 flex justify-end gap-1">
        <button
          type="button"
          className="icon-button h-6 w-6"
          onClick={onCancel}
          title="Cancel"
        >
          <X size={13} />
        </button>
        <button
          type="button"
          className="icon-button h-6 w-6 text-accent"
          onClick={onCommit}
          title="Save"
        >
          <Check size={13} />
        </button>
      </div>
    </div>
  );
});
