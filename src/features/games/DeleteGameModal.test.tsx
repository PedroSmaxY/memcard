import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteGameModal } from "./DeleteGameModal";
import { Game } from "../../hooks/useGames";

const mockGame: Game = {
  id: "test-game-123",
  name: "Chrono Trigger",
  platform: "nintendo" as const,
  savePath: "/saves/chrono.srm",
  currentHash: "hash123",
  totalSnapshots: 4,
  lastModifiedAt: "2026-10-21T18:00:00Z",
  syncStatus: "synced" as const,
  isDirectory: false,
};

describe("DeleteGameModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DeleteGameModal
        isOpen={false}
        game={mockGame}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders game title and default safe state", () => {
    render(
      <DeleteGameModal
        isOpen={true}
        game={mockGame}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("Remove Game Tracking")).toBeInTheDocument();
    expect(screen.getByText("Chrono Trigger")).toBeInTheDocument();
    expect(
      screen.getByText(/Also delete all local backup snapshots from disk \(4 snapshots\)/i)
    ).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("calls onConfirm with deleteSnapshots=false by default", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteGameModal
        isOpen={true}
        game={mockGame}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /Confirm Removal/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith("test-game-123", false);
  });

  it("calls onConfirm with deleteSnapshots=true when checked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteGameModal
        isOpen={true}
        game={mockGame}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Removal/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith("test-game-123", true);
  });

  it("triggers onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <DeleteGameModal
        isOpen={true}
        game={mockGame}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
