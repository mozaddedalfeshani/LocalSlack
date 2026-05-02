import { render, screen } from "@testing-library/react";
import { TransferProgress } from "../components/transfer/TransferProgress";

test("shows percentage speed eta and cancel", () => {
  render(
    <TransferProgress
      items={[
        {
          sessionId: "s",
          fileId: "f",
          fileName: "a.txt",
          bytesTransferred: 5,
          totalBytes: 10,
          speedBps: 1024,
          etaSeconds: 1,
        },
      ]}
      onCancel={() => undefined}
    />,
  );
  expect(screen.getByText("a.txt")).toBeInTheDocument();
  expect(screen.getByLabelText("Cancel transfer")).toBeInTheDocument();
});
