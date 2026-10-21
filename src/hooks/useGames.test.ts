import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGames } from "./useGames";
import * as tauriCore from "@tauri-apps/api/core";
import * as tauriEvent from "@tauri-apps/api/event";
import { soundEngine } from "../utils/audio";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useGames Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundEngine, "playSaveChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playRestoreChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playClick").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playAlert").mockImplementation(() => {});
  });

  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("loads fallback games in browser environment", async () => {
    const { result } = renderHook(() => useGames());

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.games.length).toBeGreaterThan(0);
    expect(result.current.games[0].name).toContain("Castlevania");
  });

  it("fetches games via Tauri invoke when in Tauri environment", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    const mockGame = {
      id: "game-uuid-1",
      name: "Silent Hill",
      platform: "ps1",
      savePath: "/saves/silent_hill.mcd",
      isDirectory: false,
      currentHash: "hash123",
      lastModifiedAt: new Date().toISOString(),
      syncStatus: "synced",
      totalSnapshots: 2,
    };

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([mockGame]);

    const { result } = renderHook(() => useGames());

    await act(async () => {});

    expect(tauriCore.invoke).toHaveBeenCalledWith("list_games");
    expect(result.current.games).toEqual([mockGame]);
  });

  it("adds a new game via invoke in Tauri environment", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([]); // initial list

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    const newGame = {
      id: "game-uuid-2",
      name: "Chrono Trigger",
      platform: "nintendo" as const,
      savePath: "/saves/chrono.srm",
      isDirectory: false,
      currentHash: "hash456",
      lastModifiedAt: new Date().toISOString(),
      syncStatus: "local_only" as const,
      totalSnapshots: 1,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(newGame);

    await act(async () => {
      await result.current.addGame({
        name: "Chrono Trigger",
        platform: "nintendo",
        savePath: "/saves/chrono.srm",
      });
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("add_game", {
      request: {
        name: "Chrono Trigger",
        platform: "nintendo",
        savePath: "/saves/chrono.srm",
      },
    });
    expect(soundEngine.playSaveChime).toHaveBeenCalled();
    expect(result.current.games).toContainEqual(newGame);
  });

  it("removes a game via invoke", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    const initialGame = {
      id: "game-to-delete",
      name: "Test Delete",
      platform: "ps1",
      savePath: "/saves/del.mcd",
      isDirectory: false,
      currentHash: "hash999",
      lastModifiedAt: new Date().toISOString(),
      syncStatus: "local_only",
      totalSnapshots: 1,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([initialGame]);

    const { result } = renderHook(() => useGames());
    await act(async () => {});
    expect(result.current.games.length).toBe(1);

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.removeGame("game-to-delete", true);
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("remove_game", {
      request: { gameId: "game-to-delete", deleteSnapshots: true },
    });
    expect(soundEngine.playClick).toHaveBeenCalled();
    expect(result.current.games).toEqual([]);
  });

  it("creates a snapshot and updates totalSnapshots count", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    const game = {
      id: "game-1",
      name: "Metroid",
      platform: "gba",
      savePath: "/saves/metroid.sav",
      isDirectory: false,
      currentHash: "hash1",
      lastModifiedAt: new Date().toISOString(),
      syncStatus: "local_only",
      totalSnapshots: 0,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([game]);

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    const mockSnap = {
      id: "snap-123",
      gameId: "game-1",
      hash: "snaphash",
      timestamp: new Date().toISOString(),
      sizeBytes: 1024,
      isPinned: false,
      label: "Boss Room",
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockSnap);

    await act(async () => {
      await result.current.createSnapshot("game-1", "Boss Room");
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("create_snapshot", {
      request: { gameId: "game-1", label: "Boss Room" },
    });
    expect(soundEngine.playSaveChime).toHaveBeenCalled();
    expect(result.current.games[0].totalSnapshots).toBe(1);
  });

  it("restores snapshot and triggers restore audio chime", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.restoreSnapshot("game-1", "snap-1");
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("restore_snapshot", {
      gameId: "game-1",
      snapshotId: "snap-1",
    });
    expect(soundEngine.playRestoreChime).toHaveBeenCalled();
  });

  it("toggles pin status on snapshot", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.togglePinSnapshot("snap-1", true);
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("pin_snapshot", {
      snapshotId: "snap-1",
      isPinned: true,
    });
    expect(soundEngine.playClick).toHaveBeenCalled();
  });

  it("handles errors and triggers alert sound on failure", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("Disk error"));

    await expect(
      result.current.createSnapshot("game-1", "Failing snapshot")
    ).rejects.toThrow("Disk error");

    expect(soundEngine.playAlert).toHaveBeenCalled();
  });

  it("handles watcher:save-changed event by playing save chime and refetching", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValue([]);

    let saveChangedHandler: ((event: unknown) => void) | undefined;
    vi.mocked(tauriEvent.listen).mockImplementation(async (eventName, handler) => {
      if (eventName === "watcher:save-changed") {
        saveChangedHandler = handler as (event: unknown) => void;
      }
      return vi.fn();
    });

    renderHook(() => useGames());
    await act(async () => {});

    expect(saveChangedHandler).toBeDefined();

    await act(async () => {
      saveChangedHandler!({
        payload: {
          gameId: "game-1",
          newHash: "abc12345",
          snapshotId: "snap-new",
          timestamp: new Date().toISOString(),
        },
      });
    });

    expect(soundEngine.playSaveChime).toHaveBeenCalled();
    expect(tauriCore.invoke).toHaveBeenCalledWith("list_games");
  });

  it("handles shield:corruption-detected event by playing alert and setting error", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValue([]);

    let corruptionHandler: ((event: unknown) => void) | undefined;
    vi.mocked(tauriEvent.listen).mockImplementation(async (eventName, handler) => {
      if (eventName === "shield:corruption-detected") {
        corruptionHandler = handler as (event: unknown) => void;
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    expect(corruptionHandler).toBeDefined();

    await act(async () => {
      corruptionHandler!({
        payload: {
          gameId: "game-1",
          gameName: "Castlevania",
          detectedSizeBytes: 0,
          previousSizeBytes: 131072,
          reason: "zero_bytes",
        },
      });
    });

    expect(soundEngine.playAlert).toHaveBeenCalled();
    expect(result.current.error).toContain("Corruption Shield alert for Castlevania");
    expect(result.current.error).toContain("file size dropped to 0 bytes");
  });

  it("handles sync:status-changed event by updating game syncStatus in state", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    const mockGame = {
      id: "game-sync-test",
      name: "Resident Evil 2",
      platform: "ps1",
      savePath: "/saves/re2.mcd",
      isDirectory: false,
      currentHash: "hash123",
      lastModifiedAt: new Date().toISOString(),
      syncStatus: "local_only",
      totalSnapshots: 1,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce([mockGame]);

    let syncStatusHandler: ((event: unknown) => void) | undefined;
    vi.mocked(tauriEvent.listen).mockImplementation(async (eventName, handler) => {
      if (eventName === "sync:status-changed") {
        syncStatusHandler = handler as (event: unknown) => void;
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useGames());
    await act(async () => {});

    expect(result.current.games[0].syncStatus).toBe("local_only");
    expect(syncStatusHandler).toBeDefined();

    // 1. Transition to syncing
    await act(async () => {
      syncStatusHandler!({
        payload: {
          gameId: "game-sync-test",
          status: "syncing",
        },
      });
    });

    expect(result.current.games[0].syncStatus).toBe("syncing");

    // 2. Transition to synced
    await act(async () => {
      syncStatusHandler!({
        payload: {
          gameId: "game-sync-test",
          status: "synced",
        },
      });
    });

    expect(result.current.games[0].syncStatus).toBe("synced");
  });
});
