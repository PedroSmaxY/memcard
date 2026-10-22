# ADR 0002: Embedded SQLite (`rusqlite`) for Metadata and Snapshot History

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Pedro H. Novais, Antigravity

---

## Context
MemCard needs to store configured games, save file/directory paths, emulator presets, immutable snapshot manifests, SHA-256 hashes, sync states, and user preferences. The storage mechanism must guarantee atomic transactions, ACID compliance, instantaneous historical queries per game, and zero risk of corrupting database records upon sudden OS shutdown or game crash.

---

## Decision
We adopt **embedded SQLite** via the synchronous `rusqlite` crate wrapped in a dedicated Tokio blocking thread pool (`tokio::task::spawn_blocking`).

1. **Schema & Migrations:** Migrations are embedded within the Rust binary and applied sequentially on startup.
2. **ACID Transactions:** New snapshot creation, hash updates, and conflict resolutions occur within atomic transactions.
3. **Location:** Placed in the standard application data directory (`$APP_DATA/memcard/storage.db`).

---

## Consequences
- **Positive:**
  - Robust relational queries for filtering snapshots by game, timestamp, and pinned status.
  - Zero daemon or external server required; minimal RAM footprint (< 2 MB for SQLite engine).
  - WAL (Write-Ahead Logging) mode provides maximum crash resilience.
- **Negative:**
  - Database file is binary and not directly editable with a text editor (unlike plain JSON), but can be inspected via any standard SQLite viewer.
