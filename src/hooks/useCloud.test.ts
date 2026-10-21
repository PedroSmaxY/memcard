import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCloud } from "./useCloud";
import * as tauriCore from "@tauri-apps/api/core";
import * as tauriEvent from "@tauri-apps/api/event";
import { soundEngine } from "../utils/audio";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useCloud Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundEngine, "playSaveChime").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playClick").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playAlert").mockImplementation(() => {});
  });

  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("fetches status via Tauri invoke on mount", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    const mockStatus = {
      isConnected: true,
      email: "player@cloud.com",
      folderName: "MemCardCloud/Saves",
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockStatus);

    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    expect(tauriCore.invoke).toHaveBeenCalledWith("get_sync_status");
    expect(result.current.status).toEqual(mockStatus);
  });

  it("handles login in browser fallback mode", async () => {
    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    expect(result.current.status.isConnected).toBe(false);

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.status.isConnected).toBe(true);
    expect(result.current.status.email).toBe("gamer.cloud@gmail.com");
    expect(soundEngine.playSaveChime).toHaveBeenCalled();
  });

  it("handles login in Tauri environment", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ isConnected: false }); // initial status

    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
      email: "cloudpro@gmail.com",
      displayName: "Cloud Pro",
    });

    await act(async () => {
      await result.current.login();
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("login_cloud");
    expect(result.current.status.isConnected).toBe(true);
    expect(result.current.status.email).toBe("cloudpro@gmail.com");
  });

  it("handles logout in Tauri environment", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
      isConnected: true,
      email: "active@gmail.com",
    });

    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.logout();
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("logout_cloud");
    expect(result.current.status.isConnected).toBe(false);
    expect(soundEngine.playClick).toHaveBeenCalled();
  });

  it("resolves conflict and clears activeConflict state", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ isConnected: true });

    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    act(() => {
      result.current.triggerSimulatedConflict("game-conflict-id", "Final Fantasy IX");
    });

    expect(result.current.activeConflict).not.toBeNull();
    expect(result.current.activeConflict?.gameName).toBe("Final Fantasy IX");
    expect(soundEngine.playAlert).toHaveBeenCalled();

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.resolveConflict("keep_local");
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("resolve_conflict", {
      request: {
        gameId: "game-conflict-id",
        action: "keep_local",
      },
    });
    expect(result.current.activeConflict).toBeNull();
    expect(soundEngine.playSaveChime).toHaveBeenCalled();
  });

  it("handles sync:status-changed push event and updates isSyncing and lastSyncedAt", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ isConnected: true, isSyncing: false });

    let statusChangedHandler: ((event: unknown) => void) | undefined;
    vi.mocked(tauriEvent.listen).mockImplementation(async (eventName, handler) => {
      if (eventName === "sync:status-changed") {
        statusChangedHandler = handler as (event: unknown) => void;
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    expect(statusChangedHandler).toBeDefined();

    // 1. Emit syncing state
    await act(async () => {
      statusChangedHandler!({
        payload: {
          gameId: "game-1",
          status: "syncing",
        },
      });
    });

    expect(result.current.status.isSyncing).toBe(true);

    // 2. Emit synced state
    await act(async () => {
      statusChangedHandler!({
        payload: {
          gameId: "game-1",
          status: "synced",
        },
      });
    });

    expect(result.current.status.isSyncing).toBe(false);
    expect(result.current.status.lastSyncedAt).toBeDefined();
  });

  it("handles sync:conflict-detected push event and sets activeConflict", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ isConnected: true });

    let conflictHandler: ((event: unknown) => void) | undefined;
    vi.mocked(tauriEvent.listen).mockImplementation(async (eventName, handler) => {
      if (eventName === "sync:conflict-detected") {
        conflictHandler = handler as (event: unknown) => void;
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useCloud());
    await act(async () => {});

    expect(conflictHandler).toBeDefined();

    const conflictPayload = {
      gameId: "game-crash-bandicoot",
      gameName: "Crash Bandicoot 3: Warped",
      localHash: "11112222",
      localTimestamp: new Date(Date.now() - 3600000).toISOString(),
      localSizeBytes: 131072,
      remoteHash: "33334444",
      remoteTimestamp: new Date().toISOString(),
      remoteSizeBytes: 131072,
    };

    await act(async () => {
      conflictHandler!({ payload: conflictPayload });
    });

    expect(soundEngine.playAlert).toHaveBeenCalled();
    expect(result.current.activeConflict).toEqual(conflictPayload);
  });
});
