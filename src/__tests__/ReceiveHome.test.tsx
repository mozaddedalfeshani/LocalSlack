import { fireEvent, render, screen } from "@testing-library/react";
import { ReceiveHome } from "../components/receive/ReceiveHome";

test("shows receive status and quick save actions", () => {
  const onQuickSaveMode = vi.fn();
  render(
    <ReceiveHome
      deviceName="Workstation"
      emoji="⭐"
      status="Online"
      quickSaveMode="off"
      onQuickSaveMode={onQuickSaveMode}
      onHistory={() => undefined}
    />,
  );

  expect(screen.getByText("Workstation")).toBeInTheDocument();
  expect(screen.getByText("Online")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Favorites" }));
  expect(onQuickSaveMode).toHaveBeenCalledWith("favorites");
});
