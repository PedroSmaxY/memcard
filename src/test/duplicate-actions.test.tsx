import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnapshotDrawer } from "../features/snapshots/SnapshotDrawer";
import { ConflictModal } from "../features/sync/ConflictModal";
import { UpdateBanner } from "../features/updater/UpdateBanner";
import { soundEngine } from "../utils/audio";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("Duplicate Action Prevention Under Loading States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundEngine, "playClick").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playSaveChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playRestoreChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playAlert").mockImplementation(() => {});
  });

  it("prevents duplicate snapshot creations when submit is clicked repeatedly", async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: unknown) => void = () => {};
    const onCreate = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveCreate = resolve;
      });
    });

    render(
      <SnapshotDrawer
        isOpen={true}
        game={{
          id: "g1",
          name: "Test Game",
          platform: "pc",
          savePath: "/tmp/save",
          isDirectory: false,
          currentHash: "123",
          lastModifiedAt: new Date().toISOString(),
          syncStatus: "local_only",
          totalSnapshots: 0,
        }}
        onClose={vi.fn()}
        onListSnapshots={vi.fn().mockResolvedValue([])}
        onCreateSnapshot={onCreate}
        onRestoreSnapshot={vi.fn()}
        onTogglePin={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Snapshot/i });

    // Click twice rapidly
    await user.click(submitBtn);
    await user.click(submitBtn);

    // Only one invocation should trigger while in-flight
    expect(onCreate).toHaveBeenCalledTimes(1);

    // Resolve in-flight request
    resolveCreate({});
  });

  it("prevents duplicate conflict resolutions when buttons are clicked rapidly", async () => {
    const user = userEvent.setup();
    let resolveAction: () => void = () => {};
    const onResolve = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveAction = resolve;
      });
    });

    render(
      <ConflictModal
        isOpen={true}
        conflict={{
          gameId: "g1",
          gameName: "Zelda Wind Waker",
          localHash: "111",
          localTimestamp: "2026-10-22T20:00:00Z",
          localSizeBytes: 1024,
          remoteHash: "222",
          remoteTimestamp: "2026-10-22T20:05:00Z",
          remoteSizeBytes: 2048,
        }}
        onResolve={onResolve}
        onClose={vi.fn()}
      />
    );

    const keepLocalBtn = screen.getByText(/Keep Local \(Upload\)/i).closest("button")!;

    await user.click(keepLocalBtn);
    await user.click(keepLocalBtn);

    expect(onResolve).toHaveBeenCalledTimes(1);
    resolveAction();
  });

  it("prevents duplicate updater installations while downloading", async () => {
    const user = userEvent.setup();
    const onInstall = vi.fn();

    const { rerender } = render(
      <UpdateBanner
        available={true}
        version="0.4.0"
        body="Changelog"
        isDownloading={false}
        progress={0}
        statusMessage={null}
        error={null}
        onInstall={onInstall}
        onDismiss={vi.fn()}
      />
    );

    const installBtn = screen.getByRole("button", { name: /Update & Restart/i });
    await user.click(installBtn);
    expect(onInstall).toHaveBeenCalledTimes(1);

    // Once isDownloading becomes true, the action button is replaced with progress state, preventing duplicate triggers
    rerender(
      <UpdateBanner
        available={true}
        version="0.4.0"
        body="Changelog"
        isDownloading={true}
        progress={45}
        statusMessage="Downloading 45%"
        error={null}
        onInstall={onInstall}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Update & Restart/i })).toBeNull();
    expect(screen.getByText(/Downloading 45%/i)).toBeInTheDocument();
  });
});
