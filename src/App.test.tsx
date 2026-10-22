import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { soundEngine } from "./utils/audio";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App Root Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundEngine, "playClick").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playSaveChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playRestoreChime").mockImplementation(() => {});
  });

  it("renders the main app title and header controls", async () => {
    render(<App />);

    expect(screen.getByText("MEMCARD")).toBeInTheDocument();
    expect(screen.getByText("Connect Drive")).toBeInTheDocument();
    expect(screen.getByTitle("Add Game")).toBeInTheDocument();
    expect(screen.getByTitle("Preferences")).toBeInTheDocument();
  });

  it("allows switching platform filters", async () => {
    const user = userEvent.setup();
    render(<App />);

    const snesTab = screen.getByRole("button", { name: "nintendo" });
    await user.click(snesTab);

    expect(soundEngine.playClick).toHaveBeenCalled();
  });

  it("opens AddGameModal when Add Game button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    const addBtn = screen.getByTitle("Add Game");
    await user.click(addBtn);

    expect(await screen.findByText("Enroll Game Save")).toBeInTheDocument();
  });

  it("opens Preferences modal when settings gear icon is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsBtn = screen.getByTitle("Preferences");
    await user.click(settingsBtn);

    expect(await screen.findByText("MemCard Preferences")).toBeInTheDocument();
  });
});
