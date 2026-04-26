import { render, screen } from "@testing-library/react";
import "../i18n";
import { FileDropZone } from "../components/transfer/FileDropZone";

test("renders drop zone", () => {
  render(<FileDropZone files={[]} onFiles={() => undefined} onRemove={() => undefined} onSend={() => undefined} />);
  expect(screen.getByText("Drop files or folders here")).toBeInTheDocument();
});
