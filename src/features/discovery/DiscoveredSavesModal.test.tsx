import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoveredSavesModal } from "./DiscoveredSavesModal";
import { DiscoveredGameSave } from "../games/presets";
import { soundEngine } from "../../utils/audio";

describe("DiscoveredSavesModal", () => {
  const mockSaves: DiscoveredGameSave[] = [
    {
      name: "Ship of Harkinian (OoT Native PC)",
      platform: "pc",
      detectedPath: "/Users/test/Library/Application Support/Ship of Harkinian/Save",
      presetId: "ship_of_harkinian",
    },
    {
      name: "DuckStation (PS1)",
      platform: "ps1",
      detectedPath: "/Users/test/.duckstation/shared_card_1.mcd",
      presetId: "duckstation",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundEngine, "playClick").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playSaveChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playAlert").mockImplementation(() => {});
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DiscoveredSavesModal
        isOpen={false}
        discovered={mockSaves}
        onClose={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders detected saves and allows batch importing", async () => {
    const user = userEvent.setup();
    const handleImport = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <DiscoveredSavesModal
        isOpen={true}
        discovered={mockSaves}
        onClose={handleClose}
        onImport={handleImport}
      />
    );

    expect(screen.getByText("Discovered Game Saves")).toBeInTheDocument();
    expect(screen.getByText("Ship of Harkinian (OoT Native PC)")).toBeInTheDocument();
    expect(screen.getByText("DuckStation (PS1)")).toBeInTheDocument();

    const importBtn = screen.getByRole("button", { name: /Import Selected \(2\)/i });
    await user.click(importBtn);

    expect(handleImport).toHaveBeenCalledTimes(1);
    expect(handleImport).toHaveBeenCalledWith([
      {
        name: "Ship of Harkinian (OoT Native PC)",
        platform: "pc",
        savePath: "/Users/test/Library/Application Support/Ship of Harkinian/Save",
        emulatorPreset: "ship_of_harkinian",
      },
      {
        name: "DuckStation (PS1)",
        platform: "ps1",
        savePath: "/Users/test/.duckstation/shared_card_1.mcd",
        emulatorPreset: "duckstation",
      },
    ]);
    expect(soundEngine.playSaveChime).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it("allows deselecting and selecting items", async () => {
    const user = userEvent.setup();
    const handleImport = vi.fn().mockResolvedValue(undefined);

    render(
      <DiscoveredSavesModal
        isOpen={true}
        discovered={mockSaves}
        onClose={vi.fn()}
        onImport={handleImport}
      />
    );

    const noneBtn = screen.getByText("None");
    await user.click(noneBtn);

    // After deselecting all, button should show (0) and be disabled
    const importBtn = screen.getByRole("button", { name: /Import Selected \(0\)/i });
    expect(importBtn).toBeDisabled();

    // Re-select first item
    const firstItem = screen.getByText("Ship of Harkinian (OoT Native PC)");
    await user.click(firstItem);

    const updatedBtn = screen.getByRole("button", { name: /Import Selected \(1\)/i });
    expect(updatedBtn).not.toBeDisabled();
  });
});
