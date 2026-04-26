import { render, screen } from "@testing-library/react";
import "../i18n";
import { ClipboardSend } from "../components/clipboard/ClipboardSend";

test("textarea and buttons render", () => {
  render(<ClipboardSend />);
  expect(screen.getByPlaceholderText("Type or paste text to send...")).toBeInTheDocument();
  expect(screen.getByText("Paste from clipboard")).toBeInTheDocument();
});
