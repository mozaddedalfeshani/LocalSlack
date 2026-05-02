import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../i18n";
import { Sidebar } from "../components/layout/Sidebar";
import { channels } from "../data/channels";
import type { DeviceInfo } from "../types";

const peer: DeviceInfo = {
  id: "peer-1",
  name: "Peer Laptop",
  emoji: "⭐",
  ip: "192.168.1.2",
  port: 53317,
  deviceType: "desktop",
  isFavorite: false,
  lastSeen: 1
};

test("sidebar shows members instead of receive and direct send tools", () => {
  render(
    <Sidebar
      devices={[peer]}
      channels={channels}
      view="channel"
      activeChannelId="general"
      onView={() => undefined}
      onChannel={() => undefined}
      onDirectMessage={() => undefined}
      onRefreshDevices={() => undefined}
      onCreateChannel={() => undefined}
      onRenameChannel={() => undefined}
      onSelect={() => undefined}
      onToggleFavorite={() => undefined}
      onSettings={() => undefined}
    />
  );

  expect(screen.getByText("Members")).toBeInTheDocument();
  expect(screen.getByText("Peer Laptop")).toBeInTheDocument();
  expect(screen.queryByText("Receive")).not.toBeInTheDocument();
  expect(screen.queryByText("Direct Send")).not.toBeInTheDocument();
});

test("clicking a member opens direct messages", async () => {
  const user = userEvent.setup();
  const onDirectMessage = vi.fn();
  render(
    <Sidebar
      devices={[peer]}
      channels={channels}
      view="channel"
      activeChannelId="general"
      onView={() => undefined}
      onChannel={() => undefined}
      onDirectMessage={onDirectMessage}
      onRefreshDevices={() => undefined}
      onCreateChannel={() => undefined}
      onRenameChannel={() => undefined}
      onSelect={() => undefined}
      onToggleFavorite={() => undefined}
      onSettings={() => undefined}
    />
  );

  await user.click(screen.getByText("Peer Laptop"));
  expect(onDirectMessage).toHaveBeenCalledWith(peer);
});
