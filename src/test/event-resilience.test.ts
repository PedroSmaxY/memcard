import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGames } from "../hooks/useGames";
import { useCloud } from "../hooks/useCloud";
import { soundEngine } from "../utils/audio";

// Setup event callbacks registry to simulate push events
type EventCallback = (event: { payload: unknown }) => void;
const listeners: Record<string, EventCallback[]> = {};

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, cb: EventCallback) => {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(cb);
    return Promise.resolve(() => {
      listeners[eventName] = listeners[eventName].filter((fn) => fn !== cb);
    });
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "list_games") return Promise.resolve([]);
    if (cmd === "get_sync_status") {
      return Promise.resolve({ isConnected: false, isSyncing: false });
    }
    return Promise.resolve();
  }),
}));

describe("Event Payload Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(soundEngine, "playAlert").mockImplementation(() => {});
    vi.spyOn(soundEngine, "playSaveChime").mockImplementation(() => {});
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    // Force window.__TAURI_INTERNALS__ to activate listeners
    (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {};
  });

  it("gracefully handles invalid/incomplete watcher:save-changed payloads without crashing", async () => {
    renderHook(() => useGames());

    // Wait for listener registration
    await vi.waitFor(() => expect(listeners["watcher:save-changed"]?.length).toBeGreaterThan(0));

    const cb = listeners["watcher:save-changed"][0];

    // Trigger with null, empty object, or missing gameId
    act(() => {
      cb({ payload: null });
      cb({ payload: {} });
      cb({ payload: { newHash: "123" } });
    });

    // Should not trigger playSaveChime
    expect(soundEngine.playSaveChime).not.toHaveBeenCalled();
  });

  it("gracefully handles invalid/incomplete shield:corruption-detected payloads", async () => {
    const { result } = renderHook(() => useGames());

    await vi.waitFor(() => expect(listeners["shield:corruption-detected"]?.length).toBeGreaterThan(0));

    const cb = listeners["shield:corruption-detected"][0];

    act(() => {
      cb({ payload: null });
      cb({ payload: {} });
    });

    // When payload is null/empty, soundEngine should not alert and error shouldn't crash
    expect(soundEngine.playAlert).not.toHaveBeenCalled();

    // Now send valid payload
    act(() => {
      cb({
        payload: {
          gameId: "g-1",
          gameName: "Sm64ex",
          detectedSizeBytes: 0,
          previousSizeBytes: 1024,
          reason: "zero_bytes",
        },
      });
    });

    expect(soundEngine.playAlert).toHaveBeenCalledTimes(1);
    expect(result.current.error).toContain("Corruption Shield alert for Sm64ex");
  });

  it("gracefully handles invalid/incomplete sync:status-changed payloads", async () => {
    renderHook(() => useCloud());

    await vi.waitFor(() => expect(listeners["sync:status-changed"]?.length).toBeGreaterThan(0));

    const cb = listeners["sync:status-changed"][0];

    // Trigger with invalid payloads
    act(() => {
      cb({ payload: null });
      cb({ payload: {} });
      cb({ payload: { message: "orphan" } });
    });

    // No exceptions raised
    expect(true).toBe(true);
  });

  it("gracefully handles invalid/incomplete sync:conflict-detected payloads", async () => {
    const { result } = renderHook(() => useCloud());

    await vi.waitFor(() => expect(listeners["sync:conflict-detected"]?.length).toBeGreaterThan(0));

    const cb = listeners["sync:conflict-detected"][0];

    act(() => {
      cb({ payload: null });
      cb({ payload: {} });
      cb({ payload: { localHash: "111" } }); // missing gameId
    });

    expect(result.current.activeConflict).toBeNull();
    expect(soundEngine.playAlert).not.toHaveBeenCalled();
  });
});
