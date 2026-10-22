import { useState, useEffect, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const isTauriEnv = () =>
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

export interface UpdaterState {
  available: boolean;
  version: string | null;
  body: string | null;
  date: string | null;
  isChecking: boolean;
  isDownloading: boolean;
  progress: number;
  error: string | null;
  statusMessage: string | null;
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    available: false,
    version: null,
    body: null,
    date: null,
    isChecking: false,
    isDownloading: false,
    progress: 0,
    error: null,
    statusMessage: null,
  });

  const [activeUpdate, setActiveUpdate] = useState<Update | null>(null);

  const checkForUpdates = useCallback(async (manual = false) => {
    if (!isTauriEnv()) {
      if (manual) {
        setState((prev) => ({
          ...prev,
          statusMessage: "Updates are checked only inside native desktop app",
        }));
        setTimeout(() => setState((prev) => ({ ...prev, statusMessage: null })), 4000);
      }
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true, error: null, statusMessage: null }));

    try {
      const update = await check();
      if (update) {
        setActiveUpdate(update);
        setState((prev) => ({
          ...prev,
          available: true,
          version: update.version,
          body: update.body || null,
          date: update.date || null,
          isChecking: false,
          statusMessage: `Version ${update.version} is available!`,
        }));
      } else {
        setActiveUpdate(null);
        setState((prev) => ({
          ...prev,
          available: false,
          isChecking: false,
          statusMessage: manual ? "MemCard is up to date" : null,
        }));
        if (manual) {
          setTimeout(() => setState((prev) => ({ ...prev, statusMessage: null })), 4000);
        }
      }
    } catch (err: unknown) {
      console.warn("Failed to check for updates:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        isChecking: false,
        error: manual ? `Check failed: ${errMsg}` : null,
      }));
    }
  }, []);

  const installUpdateAndRelaunch = useCallback(async () => {
    if (!activeUpdate) return;

    setState((prev) => ({
      ...prev,
      isDownloading: true,
      progress: 0,
      error: null,
      statusMessage: "Downloading update...",
    }));

    try {
      let downloaded = 0;
      let contentLength = 0;

      await activeUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100);
              setState((prev) => ({ ...prev, progress: pct }));
            }
            break;
          case "Finished":
            setState((prev) => ({
              ...prev,
              progress: 100,
              statusMessage: "Restarting MemCard...",
            }));
            break;
        }
      });

      // Relaunch the application cleanly
      await relaunch();
    } catch (err: unknown) {
      console.error("Failed to install update:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        error: `Installation failed: ${errMsg}`,
        statusMessage: null,
      }));
    }
  }, [activeUpdate]);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, available: false, statusMessage: null }));
  }, []);

  // Automatic background update check on app launch
  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    installUpdateAndRelaunch,
    dismiss,
  };
}
