import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { soundEngine } from "../utils/audio";
import { Platform } from "../features/games/presets";

export interface Game {
  id: string;
  name: string;
  platform: Platform;
  savePath: string;
  isDirectory: boolean;
  currentHash: string;
  lastModifiedAt: string;
  syncStatus: "synced" | "syncing" | "local_only" | "conflict" | "error";
  totalSnapshots: number;
  emulatorPreset?: string;
}

export interface Snapshot {
  id: string;
  gameId: string;
  hash: string;
  timestamp: string;
  sizeBytes: number;
  isPinned: boolean;
  label?: string;
}

export interface AddGamePayload {
  name: string;
  platform: Platform;
  savePath: string;
  emulatorPreset?: string;
}

export interface SaveChangedEventPayload {
  gameId: string;
  newHash: string;
  snapshotId: string;
  timestamp: string;
}

export interface CorruptionShieldEventPayload {
  gameId: string;
  gameName: string;
  detectedSizeBytes: number;
  previousSizeBytes: number;
  reason: "zero_bytes" | "abnormal_shrink";
}

const isTauriEnv = () => typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

// In-memory fallback for non-Tauri test/browser environments
let mockGames: Game[] = [
  {
    id: "mock-ps1-castlevania",
    name: "Castlevania: Symphony of the Night",
    platform: "ps1",
    savePath: "/Users/player/Emulators/DuckStation/memcards/shared_card_1.mcd",
    isDirectory: false,
    currentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    lastModifiedAt: new Date().toISOString(),
    syncStatus: "local_only",
    totalSnapshots: 3,
    emulatorPreset: "duckstation",
  },
];

let mockSnapshots: Record<string, Snapshot[]> = {
  "mock-ps1-castlevania": [
    {
      id: "snap-1",
      gameId: "mock-ps1-castlevania",
      hash: "e3b0c44298fc1c14",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      sizeBytes: 131072,
      isPinned: true,
      label: "Before Dracula fight",
    },
    {
      id: "snap-2",
      gameId: "mock-ps1-castlevania",
      hash: "8f4a13c98fe3b102",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      sizeBytes: 131072,
      isPinned: false,
      label: "Inverted Castle entrance",
    },
  ],
};

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isTauriEnv()) {
        const result = await invoke<Game[]>("list_games");
        setGames(result);
      } else {
        setGames([...mockGames]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();

    if (!isTauriEnv()) return;

    let isSubscribed = true;
    let unlistenSaveChanged: (() => void) | undefined;
    let unlistenCorruption: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const unlisten1 = await listen<SaveChangedEventPayload>(
          "watcher:save-changed",
          () => {
            if (!isSubscribed) return;
            soundEngine.playSaveChime();
            fetchGames();
          }
        );
        if (isSubscribed) {
          unlistenSaveChanged = unlisten1;
        } else {
          unlisten1();
        }

        const unlisten2 = await listen<CorruptionShieldEventPayload>(
          "shield:corruption-detected",
          (event) => {
            if (!isSubscribed) return;
            soundEngine.playAlert();
            setError(
              `Corruption Shield alert for ${event.payload.gameName}: Save was blocked because ${
                event.payload.reason === "zero_bytes"
                  ? "file size dropped to 0 bytes."
                  : "file size shrank abruptly by over 80%."
              }`
            );
          }
        );
        if (isSubscribed) {
          unlistenCorruption = unlisten2;
        } else {
          unlisten2();
        }
      } catch (err) {
        console.error("Failed to setup Tauri push event listeners:", err);
      }
    };

    setupListeners();

    return () => {
      isSubscribed = false;
      if (unlistenSaveChanged) unlistenSaveChanged();
      if (unlistenCorruption) unlistenCorruption();
    };
  }, [fetchGames]);

  const addGame = async (payload: AddGamePayload) => {
    try {
      if (isTauriEnv()) {
        const newGame = await invoke<Game>("add_game", { request: payload });
        setGames((prev) => [...prev, newGame]);
      } else {
        const newGame: Game = {
          id: `mock-${Date.now()}`,
          name: payload.name,
          platform: payload.platform,
          savePath: payload.savePath,
          isDirectory: false,
          currentHash: "mockhash12345678",
          lastModifiedAt: new Date().toISOString(),
          syncStatus: "local_only",
          totalSnapshots: 1,
          emulatorPreset: payload.emulatorPreset,
        };
        mockGames.push(newGame);
        setGames([...mockGames]);
      }
      soundEngine.playSaveChime();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const removeGame = async (gameId: string, deleteSnapshots: boolean = false) => {
    try {
      if (isTauriEnv()) {
        await invoke("remove_game", { request: { gameId, deleteSnapshots } });
      } else {
        mockGames = mockGames.filter((g) => g.id !== gameId);
      }
      setGames((prev) => prev.filter((g) => g.id !== gameId));
      soundEngine.playClick();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const createSnapshot = async (gameId: string, label?: string) => {
    try {
      let created: Snapshot;
      if (isTauriEnv()) {
        created = await invoke<Snapshot>("create_snapshot", {
          request: { gameId, label },
        });
      } else {
        created = {
          id: `snap-${Date.now()}`,
          gameId,
          hash: "mockhashnew9999",
          timestamp: new Date().toISOString(),
          sizeBytes: 131072,
          isPinned: false,
          label: label || "Manual snapshot",
        };
        if (!mockSnapshots[gameId]) mockSnapshots[gameId] = [];
        mockSnapshots[gameId].unshift(created);
      }
      setGames((prev) =>
        prev.map((g) =>
          g.id === gameId ? { ...g, totalSnapshots: g.totalSnapshots + 1 } : g
        )
      );
      soundEngine.playSaveChime();
      return created;
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const listSnapshots = async (gameId: string): Promise<Snapshot[]> => {
    if (isTauriEnv()) {
      return await invoke<Snapshot[]>("list_snapshots", { gameId });
    } else {
      return mockSnapshots[gameId] || [];
    }
  };

  const restoreSnapshot = async (gameId: string, snapshotId: string) => {
    try {
      if (isTauriEnv()) {
        await invoke("restore_snapshot", { gameId, snapshotId });
      }
      soundEngine.playRestoreChime();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const togglePinSnapshot = async (snapshotId: string, isPinned: boolean) => {
    try {
      if (isTauriEnv()) {
        await invoke("pin_snapshot", { snapshotId, isPinned });
      }
      soundEngine.playClick();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  return {
    games,
    isLoading,
    error,
    refreshGames: fetchGames,
    addGame,
    removeGame,
    createSnapshot,
    listSnapshots,
    restoreSnapshot,
    togglePinSnapshot,
  };
}
