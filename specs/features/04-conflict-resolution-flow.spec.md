# Feature Specification: 04 - 3-Way Conflict Resolution Flow

- **ID:** `04`
- **Status:** `Implemented`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
When playing on multiple machines without an active internet connection, local and cloud save states can diverge (both have new writes with different SHA-256 hashes). Silently overwriting either side causes catastrophic progress loss. The user must be presented with a side-by-side comparison modal with 3 explicit choices.

---

## 2. User Stories
- **As a** gamer,
- **I want** to see exactly when and how my saves diverged,
- **So that** I can pick which version to keep or save both into separate slots.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Divergence detection
- **Given** a local save with hash `H_local` and remote cloud save with hash `H_remote`
- **When** `H_local != H_remote` and both modified timestamps are newer than the last synchronized anchor
- **Then** cloud sync pauses for that game
- **And** emits `sync:conflict-detected` with metadata (timestamps, file sizes, hashes).

### Scenario: Conflict Modal Choices
- **Given** the visual conflict resolution modal
- **When** the user selects:
  1. **"Keep Local (Upload)"**: Local save is uploaded to cloud, creating a new cloud version.
  2. **"Use Cloud (Download)"**: Current local save is backed up to an immutable snapshot, and cloud save is restored.
  3. **"Branch / Duplicate"**: Local save remains in slot 1; cloud save is downloaded into a secondary slot/profile.
