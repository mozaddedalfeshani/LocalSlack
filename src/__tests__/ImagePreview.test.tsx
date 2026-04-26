import { render } from "@testing-library/react";
import { ImagePreview } from "../components/transfer/ImagePreview";

test("renders without images", () => {
  const { container } = render(<ImagePreview files={[]} />);
  expect(container).toBeEmptyDOMElement();
});
