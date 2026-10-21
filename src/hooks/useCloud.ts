import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { soundEngine } from "../utils/audio";
import { SyncConflictData } from "../features/sync/ConflictModal";

export interface CloudStatus {
  isConnected: boolean;
  email?: string;
  folderName: string;
  isSyncing: boolean;
  lastSyncedAt?: string;
}

const isTauriEnv = () => typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

export function useCloud() {
  const [status, setStatus] = useState<CloudStatus>({
    isConnected: false,
    folderName: "MemCardCloud/Saves",
    isSyncing: false,
  });
  const [activeConflict, setActiveConflict] = useState<SyncConflictData | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      if (isTauriEnv()) {
        const res = await invoke<CloudStatus>("get_sync_status");
        setStatus(res);
      }
    } catch (err) {
      console.error("Failed to fetch cloud status", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const login = async () => {
    try {
      if (isTauriEnv()) {
        const res = await invoke<{ email: string; displayName: string }>("login_cloud");
        setStatus((prev) => ({
          ...prev,
          isConnected: true,
          email: res.email,
          lastSyncedAt: new Date().toISOString(),
        }));
      } else {
        setStatus((prev) => ({
          ...prev,
          isConnected: true,
          email: "gamer.cloud@gmail.com",
          lastSyncedAt: new Date().toISOString(),
        }));
      }
      soundEngine.playSaveChime();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (isTauriEnv()) {
        await invoke("logout_cloud");
      }
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        email: undefined,
        lastSyncedAt: undefined,
      }));
      soundEngine.playClick();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const resolveConflict = async (action: "keep_local" | "use_cloud" | "branch_slot") => {
    if (!activeConflict) return;
    try {
      if (isTauriEnv()) {
        await invoke("resolve_conflict", {
          request: {
            gameId: activeConflict.gameId,
            action,
          },
        });
      }
      setActiveConflict(null);
      soundEngine.playSaveChime();
    } catch (err) {
      soundEngine.playAlert();
      throw err;
    }
  };

  const triggerSimulatedConflict = (gameId: string, gameName: string) => {
    setActiveConflict({
      gameId,
      gameName,
      localHash: "a1b2c3d4e5f60718",
      localTimestamp: new Date(Date.now() - 3600000).toISOString(),
      localSizeBytes: 131072,
      remoteHash: "f9e8d7c6b5a43210",
      remoteTimestamp: new Date().toISOString(),
      remoteSizeBytes: 135168,
    });
    soundEngine.playAlert();
  };

  return {
    status,
    activeConflict,
    setActiveConflict,
    login,
    logout,
    resolveConflict,
    triggerSimulatedConflict,
    refreshStatus: fetchStatus,
  };
}
