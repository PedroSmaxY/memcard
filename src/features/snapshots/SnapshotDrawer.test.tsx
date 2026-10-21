import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnapshotDrawer } from "./SnapshotDrawer";
import { Game, Snapshot } from "../../hooks/useGames";

const mockGame: Game = {
  id: "game-drawer-1",
  name: "Super Mario World",
  platform: "nintendo",
  savePath: "/saves/smw.srm",
  isDirectory: false,
  currentHash: "hash123",
  lastModifiedAt: new Date().toISOString(),
  syncStatus: "local_only",
  totalSnapshots: 2,
};

const mockSnapshots: Snapshot[] = [
  {
    id: "snap-a",
    gameId: "game-drawer-1",
    hash: "hash_a",
    timestamp: new Date().toISOString(),
    sizeBytes: 2048,
    isPinned: false,
    label: "Donut Plains 1",
  },
  {
    id: "snap-b",
    gameId: "game-drawer-1",
    hash: "hash_b",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    sizeBytes: 1024,
    isPinned: true,
    label: "Yoshi Island 2",
  },
];

describe("SnapshotDrawer Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <SnapshotDrawer
        game={mockGame}
        isOpen={false}
        onClose={vi.fn()}
        onListSnapshots={vi.fn()}
        onCreateSnapshot={vi.fn()}
        onRestoreSnapshot={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders snapshots list and labels", async () => {
    render(
      <SnapshotDrawer
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
        onListSnapshots={vi.fn().mockResolvedValue(mockSnapshots)}
        onCreateSnapshot={vi.fn()}
        onRestoreSnapshot={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    expect(await screen.findByText("Donut Plains 1")).toBeInTheDocument();
    expect(screen.getByText("Yoshi Island 2")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("toggles pin status on click", async () => {
    const user = userEvent.setup();
    const handleTogglePin = vi.fn().mockResolvedValue(undefined);

    render(
      <SnapshotDrawer
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
        onListSnapshots={vi.fn().mockResolvedValue(mockSnapshots)}
        onCreateSnapshot={vi.fn()}
        onRestoreSnapshot={vi.fn()}
        onTogglePin={handleTogglePin}
      />
    );

    await screen.findByText("Donut Plains 1");

    const pinButton = screen.getByTitle("Pin to protect");
    await user.click(pinButton);

    expect(handleTogglePin).toHaveBeenCalledWith("snap-a", true);
  });

  it("restores snapshot after confirmation prompt", async () => {
    const user = userEvent.setup();
    const handleRestore = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <SnapshotDrawer
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
        onListSnapshots={vi.fn().mockResolvedValue(mockSnapshots)}
        onCreateSnapshot={vi.fn()}
        onRestoreSnapshot={handleRestore}
        onTogglePin={vi.fn()}
      />
    );

    await screen.findByText("Donut Plains 1");

    const restoreButtons = screen.getAllByRole("button", { name: /restore/i });
    await user.click(restoreButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(handleRestore).toHaveBeenCalledWith("game-drawer-1", "snap-a");
  });

  it("creates a new labeled snapshot from input", async () => {
    const user = userEvent.setup();
    const handleCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <SnapshotDrawer
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
        onListSnapshots={vi.fn().mockResolvedValue(mockSnapshots)}
        onCreateSnapshot={handleCreate}
        onRestoreSnapshot={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/label \(e\.g\. before boss fight\)/i);
    await user.type(input, "Bowser Castle");

    const addBtn = screen.getByRole("button", { name: /snapshot/i });
    await user.click(addBtn);

    expect(handleCreate).toHaveBeenCalledWith("game-drawer-1", "Bowser Castle");
  });
});
