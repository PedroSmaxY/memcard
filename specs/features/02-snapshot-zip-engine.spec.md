# Feature Specification: 02 - Immutable Snapshot ZIP Engine

- **ID:** `02`
- **Status:** `Implemented`
- **Author:** MemCard Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Saves can consist of a single discrete file (e.g., `.srm`, `.sav`, `.mcd`) or an entire folder of files (e.g., RPCS3, Ryujinx, PC games). To guarantee imutability, atomic restore, and efficient cloud upload, all snapshots must be stored locally as compressed `.zip` archives indexed by game ID, SHA-256 hash, and ISO 8601 timestamp.

---

## 2. User Stories
- **As a** gamer,
- **I want** every version of my save to be archived into a clean, self-contained backup,
- **So that** I can roll back to any point in time without risking corruption.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Creating an atomic ZIP snapshot
- **Given** an enrolled game with an active save path
- **When** the snapshot engine is triggered
- **Then** it packages all save files into a `.zip` archive named `<timestamp>_<hash>.zip`
- **And** verifies the archive integrity before writing metadata to SQLite.

### Scenario: Safe restoration of a previous snapshot
- **Given** a requested snapshot restoration
- **When** the user confirms the rollback and Game Running Guard passes
- **Then** the engine creates a safety backup of the current state
- **And** extracts the target snapshot atomically using a temporary staging directory
- **And** replaces the active save only after extraction succeeds.
