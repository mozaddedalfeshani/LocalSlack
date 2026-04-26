import { render, screen } from "@testing-library/react";
import "../i18n";
import { DeviceList } from "../components/devices/DeviceList";

test("shows empty state", () => {
  render(<DeviceList devices={[]} onSelect={() => undefined} onToggleFavorite={() => undefined} />);
  expect(screen.getByText("No devices found")).toBeInTheDocument();
});
