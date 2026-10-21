import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameCard } from "./GameCard";
import { Game } from "../../hooks/useGames";

const mockGame: Game = {
  id: "test-game-1",
  name: "Valkyrie Profile",
  platform: "ps1",
  savePath: "/saves/vp.mcd",
  isDirectory: false,
  currentHash: "hash123",
  lastModifiedAt: new Date().toISOString(),
  syncStatus: "synced",
  totalSnapshots: 4,
  emulatorPreset: "duckstation",
};

describe("GameCard Component", () => {
  it("renders game name, platform, and snapshot count", () => {
    render(
      <GameCard
        game={mockGame}
        onOpenHistory={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onRemoveGame={vi.fn()}
      />
    );

    expect(screen.getByText("Valkyrie Profile")).toBeInTheDocument();
    expect(screen.getByText("ps1")).toBeInTheDocument();
    expect(screen.getByText("4 snapshots")).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("calls onOpenHistory when clicked", async () => {
    const user = userEvent.setup();
    const handleOpenHistory = vi.fn();

    render(
      <GameCard
        game={mockGame}
        onOpenHistory={handleOpenHistory}
        onCreateSnapshot={vi.fn()}
        onRemoveGame={vi.fn()}
      />
    );

    await user.click(screen.getByText("Valkyrie Profile"));
    expect(handleOpenHistory).toHaveBeenCalledWith(mockGame);
  });

  it("triggers onCreateSnapshot when camera button is clicked", async () => {
    const user = userEvent.setup();
    const handleSnapshot = vi.fn().mockResolvedValue(undefined);

    render(
      <GameCard
        game={mockGame}
        onOpenHistory={vi.fn()}
        onCreateSnapshot={handleSnapshot}
        onRemoveGame={vi.fn()}
      />
    );

    const snapshotBtn = screen.getByTitle("Create Immediate Snapshot");
    await user.click(snapshotBtn);

    expect(handleSnapshot).toHaveBeenCalledWith("test-game-1");
  });

  it("triggers onRemoveGame when confirm prompt is accepted", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    render(
      <GameCard
        game={mockGame}
        onOpenHistory={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onRemoveGame={handleRemove}
      />
    );

    const removeBtn = screen.getByTitle("Remove Game");
    await user.click(removeBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(handleRemove).toHaveBeenCalledWith("test-game-1");
  });
});
