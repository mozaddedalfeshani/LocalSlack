import { render, screen } from "@testing-library/react";
import "../i18n";
import { SettingsMenu } from "../components/settings/SettingsMenu";

test("tabs render", () => {
  render(<SettingsMenu open onClose={() => undefined} />);
  expect(screen.getByText("Settings")).toBeInTheDocument();
  expect(screen.getByText("General")).toBeInTheDocument();
});
