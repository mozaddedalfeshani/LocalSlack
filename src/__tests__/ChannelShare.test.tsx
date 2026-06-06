import { render, screen, fireEvent } from "@testing-library/react";
import "../i18n";
import { ChannelShare } from "../components/channel/ChannelShare";
import { useChannelStore } from "../store/channelStore";
import { Hash } from "lucide-react";
import type { DeviceInfo, ChannelEvent } from "../types";

const mockChannel = {
  id: "general",
  name: "general",
  title: "General Chat",
  description: "Talk about anything",
  icon: Hash,
  messageCount: 0,
  lastNameChanges: [],
};

const localDevice: DeviceInfo = {
  id: "local",
  name: "Local User",
  emoji: "💻",
  ip: "127.0.0.1",
  port: 53317,
  deviceType: "desktop",
  isFavorite: false,
  lastSeen: 1,
};

const peerDevice: DeviceInfo = {
  id: "peer",
  name: "Peer User",
  emoji: "🚀",
  ip: "127.0.0.1",
  port: 53318,
  deviceType: "desktop",
  isFavorite: false,
  lastSeen: 1,
};

const parentEvent: ChannelEvent = {
  id: "msg-1",
  channelId: "general",
  kind: "text",
  authorId: "peer",
  authorName: "Peer User",
  authorEmoji: "🚀",
  text: "Hello, this is the parent message!",
  availableCount: 1,
  createdAt: 1000,
  updatedAt: 1000,
};

const replyEvent: ChannelEvent = {
  id: "msg-2",
  channelId: "general",
  kind: "text",
  authorId: "local",
  authorName: "Local User",
  authorEmoji: "💻",
  text: "This is a reply!",
  availableCount: 1,
  createdAt: 2000,
  updatedAt: 2000,
  parentId: "msg-1",
};

describe("ChannelShare Threading tests", () => {
  beforeEach(() => {
    useChannelStore.setState({ events: [] });
  });

  test("hides thread replies from main channel feed", () => {
    useChannelStore.setState({ events: [parentEvent, replyEvent] });

    render(
      <ChannelShare
        channel={mockChannel}
        localDevice={localDevice}
        devices={[peerDevice]}
        files={[]}
        progress={[]}
        onRefresh={() => undefined}
        onPickFiles={() => undefined}
        onPickFolder={() => undefined}
        onRemoveFile={() => undefined}
        onClearFiles={() => undefined}
        onSendFiles={() => undefined}
        onSendMessage={() => undefined}
        onDeleteEvent={() => undefined}
        onEditMessage={() => undefined}
        onDownloadAsset={() => undefined}
        onOpenAsset={() => undefined}
        onCancel={() => undefined}
      />
    );

    // Parent message should be visible in main chat
    expect(screen.getByText("Hello, this is the parent message!")).toBeInTheDocument();
    // Reply message should NOT be visible in main chat (since it's a thread reply)
    expect(screen.queryByText("This is a reply!")).not.toBeInTheDocument();
  });

  test("renders replies count indicator and opens thread on click", () => {
    useChannelStore.setState({ events: [parentEvent, replyEvent] });

    render(
      <ChannelShare
        channel={mockChannel}
        localDevice={localDevice}
        devices={[peerDevice]}
        files={[]}
        progress={[]}
        onRefresh={() => undefined}
        onPickFiles={() => undefined}
        onPickFolder={() => undefined}
        onRemoveFile={() => undefined}
        onClearFiles={() => undefined}
        onSendFiles={() => undefined}
        onSendMessage={() => undefined}
        onDeleteEvent={() => undefined}
        onEditMessage={() => undefined}
        onDownloadAsset={() => undefined}
        onOpenAsset={() => undefined}
        onCancel={() => undefined}
      />
    );

    // Should render the reply indicator button
    const replyBtn = screen.getByText("1 reply");
    expect(replyBtn).toBeInTheDocument();

    // Click to open thread panel
    fireEvent.click(replyBtn);

    // Parent message and the reply should be displayed inside the Thread sidebar
    // We should see "Thread" header
    expect(screen.getByText("Thread")).toBeInTheDocument();
    
    // The reply message "This is a reply!" should now be in the document (within thread list)
    expect(screen.getAllByText("This is a reply!").length).toBeGreaterThan(0);
  });
});
