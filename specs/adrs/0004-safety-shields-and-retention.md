# ADR 0004: Safety Shields, Game Running Guard, and Snapshot Retention

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Pedro H. Novais, Antigravity

---

## Context
Video game saves represent hundreds of hours of irreplaceable player effort. Emulators can crash mid-save, creating empty 0-byte files, and simultaneous write operations (e.g. restoring an old save while the emulator is actively running) can corrupt disk sectors or cause race conditions. Furthermore, frequent autosaves can balloon local disk and cloud storage if left unmanaged.

---

## Decision
1. **Zero-Byte & Corruption Shield:**
   - When the watcher fires, before processing a snapshot, check the total byte size of the target save.
   - If size == 0 bytes, or if size has abruptly shrunk by > 80% compared to the latest valid snapshot without user confirmation:
     - Block cloud upload immediately.
     - Emit `shield:corruption-detected` event to the frontend with an alert.
     - Keep the previous valid snapshot as the active healthy backup.
2. **Game Running Guard:**
   - Before executing a version restore or cloud overwrite, inspect file system locks and process tables.
   - If the target file is locked or the emulator binary is actively running, refuse the destructive operation and prompt the user to close the game first.
3. **Retention Policy & Snapshot Pinning:**
   - Maintain a configurable cap of snapshots per game (default: 20).
   - Allow users to "Pin/Star" specific snapshots (e.g., "Before Boss", "100% Ending") which are strictly immune to automatic pruning.

---

## Consequences
- **Positive:**
  - Absolute data protection against emulator glitches and user error.
  - Predictable disk footprint without accidental loss of important historical saves.
