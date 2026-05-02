import { render, screen } from "@testing-library/react";
import "../i18n";
import { HistoryList } from "../components/history/HistoryList";

test("renders search and clear", () => {
  render(<HistoryList />);
  expect(
    screen.getByPlaceholderText("Search files or devices..."),
  ).toBeInTheDocument();
});
