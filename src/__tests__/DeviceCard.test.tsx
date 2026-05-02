import { render, screen } from "@testing-library/react";
import { DeviceCard } from "../components/devices/DeviceCard";

const device = {
  id: "1",
  name: "Laptop",
  ip: "127.0.0.1",
  port: 53317,
  deviceType: "desktop" as const,
  isFavorite: false,
  lastSeen: Math.floor(Date.now() / 1000),
};

test("renders name and ip", () => {
  render(<DeviceCard device={device} />);
  expect(screen.getByText("Laptop")).toBeInTheDocument();
  expect(screen.getByText("127.0.0.1:53317")).toBeInTheDocument();
});
