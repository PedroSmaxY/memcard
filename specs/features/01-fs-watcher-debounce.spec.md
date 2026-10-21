# Feature Specification: 01 - File System Watcher & Debounce

- **ID:** `01`
- **Status:** `Accepted`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Emulators and games continuously write or update save data during gameplay. A naive watcher immediately triggering on disk events will read locked files, incomplete writes, or trigger dozens of redundant sync operations. We require an asynchronous watcher with a 3-second quiet-period debounce and SHA-256 tree hashing.

---

## 2. User Stories
- **As a** gamer,
- **I want** the system to detect when I save my game without interrupting my gameplay,
- **So that** my save is immediately backed up and synchronized without CPU spikes or file corruption.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Debounced save detection on a single file
- **Given** an enrolled game watching path `/saves/game.srm`
- **When** the emulator writes to `/saves/game.srm` multiple times within 2 seconds
- **Then** the watcher resets its timer and waits for 3 seconds of total write silence
- **And** calculates the SHA-256 hash of `/saves/game.srm`
- **And** triggers a snapshot only if the hash has actually changed from the last recorded state.

### Scenario: Directory tree hashing for complex saves
- **Given** an enrolled game watching directory `/saves/PS3_SAVEDATA/`
- **When** files inside the directory tree are updated
- **Then** the watcher deterministically walks the directory, sorts file paths, hashes each file, and computes a composite tree hash.
