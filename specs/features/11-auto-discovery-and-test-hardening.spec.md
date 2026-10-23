# Feature Specification: 11 - Native Port Presets, Auto-Discovery Scanner & Rigorous Safety Test Hardening

- **ID:** `11`
- **Status:** `Implemented`
- **Author(s):** Pedro H. Novais, Antigravity
- **Created:** 2026-10-22
- **Updated:** 2026-10-22

---

## 1. Context & Motivation
MemCard is dedicated to retro and enthusiast game save preservation. Two key evolution vectors are addressed in this specification:
1. **Pivoting Presets to Native PC Recompilations & Ports:** Standard commercial Steam titles are removed in favor of native PC recompilations and ports (*Zelda Wind Waker HD Recomp*, *Twilit Realm/dusklight*, *Ship of Harkinian*, *2 Ship 2 Harkinian*, *Sm64ex*, and *OpenGOAL*).
2. **Auto-Discovery Scanner:** Instead of manually browsing file trees, players can scan their local machine with 1 click to auto-detect installed emulator memory cards and native PC port saves.
3. **Rigorous Test Suite & Safety Invariant Hardening:** Fulfills all 12 test audit gaps:
   - Vitest coverage reports with `@vitest/coverage-v8` (`pnpm test:coverage`) and CI enforcement.
   - Automated contract verification comparing markdown spec contracts with Rust serialization and frontend payloads.
   - Event payload resilience against corrupted or incomplete Tauri push events.
   - UI loading guards preventing duplicate requests during async operations.
   - Full integrated watcher lifecycle pipelines (normal change detection & shield corruption blocking).
   - Explicit zero-byte and 80% shrink cloud upload inhibition tests.
   - Hardened OAuth loopback error scenarios.
   - SQLite resilience testing for transaction failures.

---

## 2. User Stories
- **As a** PC retro gamer playing decompilations like *Ship of Harkinian* or *Wind Waker HD Recomp*,
- **I want** built-in presets and auto-discovery for my native port save files,
- **So that** I don't have to navigate deep application data folders manually.

- **As a** user with existing emulators and ports installed,
- **I want** MemCard to show an auto-discovery banner on first launch with a 1-click batch import modal,
- **So that** I can enroll all my memory cards in seconds.

- **As a** developer and maintainer,
- **I want** automated contract verification, full watcher pipeline integration tests, and cloud shield inhibition guarantees,
- **So that** zero save loss is mathematically and experimentally guaranteed.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Native Port Presets Availability
- **Given** the presets catalog
- **When** the user opens the Add Game modal or searches presets
- **Then** native ports (*Zelda Wind Waker HD Recomp*, *Twilit Realm*, *Ship of Harkinian*, *2 Ship 2 Harkinian*, *Sm64ex*, *OpenGOAL*) are available
- **And** commercial Steam presets are completely removed.

### Scenario: Auto-Discovery Scanner Detection
- **Given** the user runs the auto-discovery scanner
- **When** the backend scans known emulator and port save paths on the host OS
- **Then** any detected save files are returned in a `Vec<DiscoveredGameSave>`
- **And** already-enrolled paths are excluded.

### Scenario: 1-Click Batch Import
- **Given** discovered saves from the auto-discovery scan
- **When** the user clicks "Import Selected"
- **Then** baseline snapshots are created for each selected save
- **And** they are enrolled in real-time fs watching.

### Scenario: Shield Invariant - Zero-Byte and Abrupt Shrink Upload Inhibition
- **Given** a save file drops to 0 bytes or drops more than 80% in size
- **When** the watcher or cloud sync processes the change
- **Then** the `Corruption Shield` blocks snapshot creation and cloud upload
- **And** emits a `shield:corruption-detected` event.

---

## 4. Architecture & Interface Contracts

### Tauri Command: `scan_installed_saves`
```rust
#[tauri::command]
pub async fn scan_installed_saves(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<DiscoveredGameSave>, String>
```

### DiscoveredGameSave Type
```typescript
export interface DiscoveredGameSave {
  name: string;
  platform: Platform;
  detectedPath: string;
  presetId?: string;
}
```
