import { describe, it, expect } from "vitest";
import { SyncConflictData } from "./ConflictModal";

describe("Conflict Modal Data Structure", () => {
  it("formats conflict metadata properly", () => {
    const conflict: SyncConflictData = {
      gameId: "game-123",
      gameName: "Chrono Cross",
      localHash: "aaaa1111bbbb2222",
      localTimestamp: new Date().toISOString(),
      localSizeBytes: 131072,
      remoteHash: "cccc3333dddd4444",
      remoteTimestamp: new Date().toISOString(),
      remoteSizeBytes: 135168,
    };

    expect(conflict.gameId).toBe("game-123");
    expect(conflict.localHash).not.toBe(conflict.remoteHash);
    expect(conflict.localSizeBytes).toBeGreaterThan(0);
    expect(conflict.remoteSizeBytes).toBeGreaterThan(0);
  });
});
