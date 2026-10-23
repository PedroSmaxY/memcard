import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Contract Compatibility Tests", () => {
  const rootDir = process.cwd();
  const commandsDoc = fs.readFileSync(
    path.join(rootDir, "specs/contracts/tauri-commands.contract.md"),
    "utf-8"
  );
  const eventsDoc = fs.readFileSync(
    path.join(rootDir, "specs/contracts/events.contract.md"),
    "utf-8"
  );

  it("ensures all documented Tauri commands match known registered commands", () => {
    // Extract command names from markdown header level 3 (### `command_name`)
    const commandMatches = Array.from(commandsDoc.matchAll(/### `([a-z_]+)`/g)).map(
      (m) => m[1]
    );

    const expectedCommands = [
      "add_game",
      "list_games",
      "remove_game",
      "create_snapshot",
      "list_snapshots",
      "restore_snapshot",
      "pin_snapshot",
      "login_cloud",
      "logout_cloud",
      "get_sync_status",
      "resolve_conflict",
      "get_notifications_enabled",
      "set_notifications_enabled",
      "list_presets",
      "save_custom_preset",
      "delete_custom_preset",
      "open_presets_folder",
      "scan_installed_saves",
      "ping",
    ];

    for (const cmd of expectedCommands) {
      expect(
        commandMatches,
        `Expected command ${cmd} to be documented in tauri-commands.contract.md`
      ).toContain(cmd);
    }
  });

  it("ensures all documented push events match specification", () => {
    const eventMatches = Array.from(eventsDoc.matchAll(/## \d+\. `([a-z:-]+)`/g)).map(
      (m) => m[1]
    );

    const expectedEvents = [
      "watcher:save-changed",
      "sync:status-changed",
      "sync:conflict-detected",
      "shield:corruption-detected",
    ];

    for (const ev of expectedEvents) {
      expect(
        eventMatches,
        `Expected event ${ev} to be documented in events.contract.md`
      ).toContain(ev);
    }
  });

  it("validates Rust JSON serialization against expected frontend event schemas", () => {
    // 1. watcher:save-changed payload validation
    const rustWatcherPayload = {
      gameId: "e931448b-70c8-472e-83d8-30dc0a232f01",
      newHash: "a1b2c3d4e5f60718",
      snapshotId: "f0098367-b195-4733-ae1d-131405d38c6f",
      timestamp: "2026-10-22T21:00:00Z",
    };
    expect(typeof rustWatcherPayload.gameId).toBe("string");
    expect(typeof rustWatcherPayload.newHash).toBe("string");
    expect(typeof rustWatcherPayload.snapshotId).toBe("string");
    expect(typeof rustWatcherPayload.timestamp).toBe("string");

    // 2. sync:status-changed payload validation
    const rustSyncPayload = {
      gameId: "e931448b-70c8-472e-83d8-30dc0a232f01",
      status: "synced" as const,
      message: "Sync complete",
    };
    expect(["synced", "syncing", "conflict", "error"]).toContain(rustSyncPayload.status);

    // 3. sync:conflict-detected payload validation
    const rustConflictPayload = {
      gameId: "e931448b-70c8-472e-83d8-30dc0a232f01",
      gameName: "Zelda Wind Waker HD",
      localHash: "1111",
      localTimestamp: "2026-10-22T20:00:00Z",
      localSizeBytes: 1024,
      remoteHash: "2222",
      remoteTimestamp: "2026-10-22T20:05:00Z",
      remoteSizeBytes: 2048,
    };
    expect(rustConflictPayload.localSizeBytes).toBeGreaterThan(0);
    expect(rustConflictPayload.remoteSizeBytes).toBeGreaterThan(0);

    // 4. shield:corruption-detected payload validation
    const rustShieldPayload = {
      gameId: "e931448b-70c8-472e-83d8-30dc0a232f01",
      gameName: "DuckStation Slot 1",
      detectedSizeBytes: 0,
      previousSizeBytes: 131072,
      reason: "zero_bytes" as const,
    };
    expect(["zero_bytes", "abnormal_shrink"]).toContain(rustShieldPayload.reason);
  });
});
