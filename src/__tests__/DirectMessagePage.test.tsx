import { render, screen } from "@testing-library/react";
import "../i18n";
import { DirectMessagePage } from "../components/direct/DirectMessagePage";
import type { DeviceInfo, DirectMessageEvent } from "../types";

const localDevice: DeviceInfo = {
  id: "local",
  name: "Local",
  emoji: "🚀",
  ip: "192.168.1.1",
  port: 53317,
  deviceType: "desktop",
  isFavorite: false,
  lastSeen: 1
};

const peer: DeviceInfo = {
  id: "peer",
  name: "Peer",
  emoji: "⭐",
  ip: "192.168.1.2",
  port: 53317,
  deviceType: "desktop",
  isFavorite: false,
  lastSeen: 1
};

const event: DirectMessageEvent = {
  id: "msg-1",
  peerId: "peer",
  kind: "text",
  authorId: "peer",
  authorName: "Peer",
  authorEmoji: "⭐",
  recipientId: "local",
  recipientName: "Local",
  recipientEmoji: "🚀",
  text: "hello directly",
  createdAt: 1,
  updatedAt: 1
};

test("direct message page shows empty state", () => {
  render(
    <DirectMessagePage
      device={peer}
      localDevice={localDevice}
      events={[]}
      files={[]}
      progress={[]}
      onRefresh={() => undefined}
      onPickFiles={() => undefined}
      onPickFolder={() => undefined}
      onRemoveFile={() => undefined}
      onClearFiles={() => undefined}
      onSendText={() => undefined}
      onSendFiles={() => undefined}
      onOpenAsset={() => undefined}
      onCancel={() => undefined}
    />
  );

  expect(screen.getByText("No direct messages yet")).toBeInTheDocument();
});

test("direct message page renders message events", () => {
  render(
    <DirectMessagePage
      device={peer}
      localDevice={localDevice}
      events={[event]}
      files={[]}
      progress={[]}
      onRefresh={() => undefined}
      onPickFiles={() => undefined}
      onPickFolder={() => undefined}
      onRemoveFile={() => undefined}
      onClearFiles={() => undefined}
      onSendText={() => undefined}
      onSendFiles={() => undefined}
      onOpenAsset={() => undefined}
      onCancel={() => undefined}
    />
  );

  expect(screen.getByText("hello directly")).toBeInTheDocument();
});
