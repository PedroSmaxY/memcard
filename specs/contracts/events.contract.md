# Contract: Tauri Push Events

This document specifies asynchronous push events emitted by the Rust core to the React frontend (`appWindow.listen(...)`).

---

## 1. `watcher:save-changed`
Emitted after the 3-second debounce expires, hashing is verified, and a local snapshot is successfully created.

- **Payload:**
  ```typescript
  interface SaveChangedEvent {
    gameId: string;
    newHash: string;
    snapshotId: string;
    timestamp: string; // ISO 8601
  }
  ```

---

## 2. `sync:status-changed`
Emitted when cloud synchronization starts, finishes, or encounters an error.

- **Payload:**
  ```typescript
  interface SyncStatusChangedEvent {
    gameId: string;
    status: "synced" | "syncing" | "conflict" | "error";
    message?: string;
  }
  ```

---

## 3. `sync:conflict-detected`
Emitted when a remote cloud save diverges from the local save by both timestamp and hash.

- **Payload:**
  ```typescript
  interface ConflictDetectedEvent {
    gameId: string;
    gameName: string;
    localHash: string;
    localTimestamp: string;
    localSizeBytes: number;
    remoteHash: string;
    remoteTimestamp: string;
    remoteSizeBytes: number;
  }
  ```

---

## 4. `shield:corruption-detected`
Emitted when the Zero-Byte Shield halts cloud upload due to an empty or abnormal size drop.

- **Payload:**
  ```typescript
  interface CorruptionShieldEvent {
    gameId: string;
    gameName: string;
    detectedSizeBytes: number;
    previousSizeBytes: number;
    reason: "zero_bytes" | "abnormal_shrink";
  }
  ```
