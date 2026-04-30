import { render, screen } from "@testing-library/react";
import "../i18n";
import { ReceiveDialog } from "../components/transfer/ReceiveDialog";

test("shows sender and actions", () => {
  const sender = { id: "1", name: "Phone", ip: "1.1.1.1", port: 53317, deviceType: "mobile" as const, isFavorite: false, lastSeen: 1 };
  render(<ReceiveDialog sender={sender} files={[]} onAccept={() => undefined} onReject={() => undefined} />);
  expect(screen.getByText("Phone")).toBeInTheDocument();
  expect(screen.getByText("Accept")).toBeInTheDocument();
});
