# Feature Specification: 06 - Safety Shields, File Locks & Retention Policy

- **ID:** `06`
- **Status:** `Implemented`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Crashes and simultaneous file writes can destroy video game saves. MemCard Cloud enforces a Zero-Byte Shield against corrupt saves, a Game Running Guard to block restoring while games are active, and an automated retention policy that preserves user-pinned milestones.

---

## 2. User Stories
- **As a** gamer,
- **I want** the system to actively prevent me or a crashing emulator from destroying my saves,
- **So that** I never lose game progress under any circumstance.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Zero-Byte Shield Protection
- **Given** an enrolled game monitored by the watcher
- **When** an emulator crashes and writes a 0-byte or abruptly diminished (>80% loss) file
- **Then** the watcher halts cloud synchronization
- **And** emits `shield:corruption-detected` with an emergency alert
- **And** keeps the previous valid snapshot intact.

### Scenario: Game Running Guard File Lock
- **Given** a game currently running in an emulator
- **When** the user attempts to restore a historical snapshot
- **Then** the backend checks for open file locks and running process signatures
- **And** if locked, rejects the restore operation with: "Game is currently running. Please close the emulator before restoring."

### Scenario: Retention Pruning with Pinned Snapshots
- **Given** a configured retention limit of $N$ snapshots
- **When** a new snapshot is created and unpinned snapshots exceed $N$
- **Then** the oldest unpinned snapshots are pruned
- **And** all pinned snapshots are strictly retained.

### Scenario: Pre-Restore Safety Backup Obligation (Zero Save Loss)
- **Given** an active game save on disk and a restore operation requested
- **When** the pre-restore backup snapshot creation fails (e.g., I/O error or disk full)
- **Then** the restore operation is immediately aborted with an explicit error
- **And** the active save file on disk is left 100% untouched and intact.

### Scenario: Baseline Snapshot Mandatory Enforcement
- **Given** a user attempting to enroll a new game save
- **When** the initial baseline snapshot creation fails or is rejected by the Zero-Byte Shield
- **Then** the game enrollment is strictly aborted
- **And** any partial database records are cleaned up
- **And** an explicit error is returned to the user.
