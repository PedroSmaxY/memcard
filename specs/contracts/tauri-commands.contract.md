# Contract: Tauri IPC Commands

This document specifies the typed contract between the Rust backend (`src-tauri/src/commands/`) and the React 19 frontend (`src/hooks/`).

---

## 1. Games Management

### `add_game`
Registers a new game/save target to be watched and versioned.
- **Parameters:**
  ```typescript
  interface AddGameRequest {
    name: string;
    platform: "ps1" | "ps2" | "nintendo" | "modern" | "pc";
    savePath: string; // Absolute path to file or directory
    emulatorPreset?: string;
  }
  ```
- **Returns:**
  ```typescript
  interface GameDto {
    id: string; // UUID v4
    name: string;
    platform: "ps1" | "ps2" | "nintendo" | "modern" | "pc";
    savePath: string;
    isDirectory: boolean;
    currentHash: string;
    lastModifiedAt: string; // ISO 8601
    syncStatus: "synced" | "syncing" | "local_only" | "conflict" | "error";
    totalSnapshots: number;
    emulatorPreset?: string;
  }
  ```

### `list_games`
Lists all enrolled games grouped by platform.
- **Parameters:** none
- **Returns:** `GameDto[]`

### `remove_game`
Unenrolls a game from monitoring (with option to keep or delete local snapshots).
- **Parameters:**
  ```typescript
  interface RemoveGameRequest {
    gameId: string;
    deleteSnapshots: boolean;
  }
  ```
- **Returns:** `void`

---

## 2. Snapshot Management

### `create_snapshot`
Forces an immediate manual snapshot creation.
- **Parameters:**
  ```typescript
  interface CreateSnapshotRequest {
    gameId: string;
    label?: string;
  }
  ```
- **Returns:** `SnapshotDto`

### `list_snapshots`
Returns all historical snapshots for a specific game.
- **Parameters:** `{ gameId: string }`
- **Returns:**
  ```typescript
  interface SnapshotDto {
    id: string;
    gameId: string;
    hash: string;
    timestamp: string; // ISO 8601
    sizeBytes: number;
    isPinned: boolean;
    label?: string;
  }
  ```

### `restore_snapshot`
Restores a previous snapshot, strictly guarded by `Game Running Guard`.
- **Parameters:** `{ gameId: string, snapshotId: string }`
- **Returns:** `void`

### `pin_snapshot`
Toggles the pinned status of a snapshot to protect it from retention pruning.
- **Parameters:** `{ snapshotId: string, isPinned: boolean }`
- **Returns:** `void`

---

## 3. Cloud Synchronization

### `login_cloud`
Starts the 1-click Google Drive PKCE flow and opens system browser.
- **Parameters:** none
- **Returns:** `{ email: string, displayName: string }`

### `logout_cloud`
Disconnects Google Drive and purges local access tokens.
- **Parameters:** none
- **Returns:** `void`

### `get_sync_status`
Returns current cloud connection state.
- **Parameters:** none
- **Returns:**
  ```typescript
  interface CloudStatusDto {
    isConnected: boolean;
    email?: string;
    folderName: string;
    isSyncing: boolean;
    lastSyncedAt?: string;
  }
  ```

### `resolve_conflict`
Applies user's chosen conflict resolution strategy.
- **Parameters:**
  ```typescript
  interface ResolveConflictRequest {
    gameId: string;
    action: "keep_local" | "use_cloud" | "branch_slot";
  }
  ```
- **Returns:** `void`

---

## 4. User Preferences & Notifications

### `get_notifications_enabled`
Returns whether desktop OS notifications are enabled.
- **Parameters:** none
- **Returns:** `boolean`

### `set_notifications_enabled`
Enables or disables desktop OS notifications (Gamer Mode).
- **Parameters:** `{ enabled: boolean }`
- **Returns:** `void`

---

## 5. Emulator & Community Presets

### `list_presets`
Returns all aggregated presets (built-in repository presets merged with user mod presets from `$APP_DATA/presets`), including smart on-disk detected save paths.
- **Parameters:** none
- **Returns:** `PresetDto[]`
  ```typescript
  interface PresetPaths {
    macos?: string[];
    windows?: string[];
    linux?: string[];
  }

  interface PresetDto {
    id: string;
    name: string;
    platform: string;
    saveType: string;
    fileExtensions: string[];
    defaultPaths: PresetPaths;
    description: string;
    author: string;
    version: string;
    isCustom: boolean;
    detectedPath?: string;
  }
  ```

### `save_custom_preset`
Saves or updates a custom user preset `.json` definition in `$APP_DATA/presets`.
- **Parameters:** `{ preset: PresetDto }`
- **Returns:** `void`

### `delete_custom_preset`
Removes a custom preset file by ID from `$APP_DATA/presets`.
- **Parameters:** `{ presetId: string }`
- **Returns:** `void`

### `open_presets_folder`
Opens the user's custom mod presets directory in the native file manager (Finder / Explorer / xdg-open).
- **Parameters:** none
- **Returns:** `void`

### `scan_installed_saves`
Scans the host file system for known emulator and native port save directories, returning games found that are not yet enrolled.
- **Parameters:** none
- **Returns:** `DiscoveredGameSaveDto[]`
  ```typescript
  interface DiscoveredGameSaveDto {
    name: string;
    platform: string;
    detectedPath: string;
    presetId?: string;
  }
  ```

---

## 6. Utility

### `ping`
Diagnostic health-check command.
- **Parameters:** none
- **Returns:** `"pong"`
