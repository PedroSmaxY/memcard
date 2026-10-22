import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUpdater } from "./useUpdater";
import * as tauriUpdater from "@tauri-apps/plugin-updater";
import * as tauriProcess from "@tauri-apps/plugin-process";

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

describe("useUpdater Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("handles non-tauri environment gracefully", async () => {
    const { result } = renderHook(() => useUpdater());

    expect(result.current.available).toBe(false);

    await act(async () => {
      await result.current.checkForUpdates(true);
    });

    expect(result.current.statusMessage).toContain("native desktop app");
  });

  it("detects update when available in tauri environment", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    const mockUpdate = {
      version: "0.3.0",
      body: "Changelog details",
      date: "2026-10-22",
      downloadAndInstall: vi.fn(),
    };

    vi.mocked(tauriUpdater.check).mockResolvedValue(mockUpdate as unknown as tauriUpdater.Update);

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      await result.current.checkForUpdates(false);
    });

    expect(result.current.available).toBe(true);
    expect(result.current.version).toBe("0.3.0");
    expect(result.current.body).toBe("Changelog details");
  });

  it("downloads update and relaunches application", async () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    const mockDownloadAndInstall = vi.fn().mockImplementation(async (cb) => {
      cb({ event: "Started", data: { contentLength: 100 } });
      cb({ event: "Progress", data: { chunkLength: 50 } });
      cb({ event: "Finished" });
    });

    const mockUpdate = {
      version: "0.3.0",
      body: "Changelog details",
      date: "2026-10-22",
      downloadAndInstall: mockDownloadAndInstall,
    };

    vi.mocked(tauriUpdater.check).mockResolvedValue(mockUpdate as unknown as tauriUpdater.Update);

    const { result } = renderHook(() => useUpdater());

    await act(async () => {
      await result.current.checkForUpdates(false);
    });

    await act(async () => {
      await result.current.installUpdateAndRelaunch();
    });

    expect(mockDownloadAndInstall).toHaveBeenCalledTimes(1);
    expect(tauriProcess.relaunch).toHaveBeenCalledTimes(1);
  });
});
