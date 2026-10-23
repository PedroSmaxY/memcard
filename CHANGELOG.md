# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-22

### Added
- **Auto-Discovery Save Scanner (`scan_installed_saves`):** Scans the local filesystem for known emulator memory cards and native PC decompilation saves, returning unenrolled games.
- **Interactive Auto-Discovery UI:** Added discrete `DiscoveredSavesBanner` and comprehensive `DiscoveredSavesModal` with 1-click batch import into active version tracking.
- **Native PC Recompilations & Ports Presets:** Replaced commercial Steam titles with built-in presets for *Zelda: The Wind Waker HD Recomp*, *Twilit Realm (Dusklight)*, *Ship of Harkinian*, *2 Ship 2 Harkinian*, *Super Mario 64 PC Port (sm64ex)*, and *OpenGOAL (Jak & Daxter)*.
- **macOS Window Lifecycle & Reopen:** Supported `tauri::RunEvent::Reopen` to restore and focus the window upon clicking the macOS Dock icon, plus left-click restore from the system Menu Bar tray icon.
- **Titlebar Traffic Light Cursor Affordance:** Isolated native window controls in a non-draggable area to preserve native arrow cursor interaction.
- **Automated Contract Compatibility Suite:** Added automated tests comparing IPC markdown contracts with Rust serialization and React frontend payloads (`src/test/contracts.test.ts`).
- **Tauri Push Event Payload Resilience:** Added defensive guards against null, incomplete, or corrupted event payloads across all 4 push events (`src/test/event-resilience.test.ts`).
- **Loading State & Duplicate Action Guards:** Added UI and hook guards preventing duplicate triggers during snapshot creation, restores, conflict resolutions, and updates (`src/test/duplicate-actions.test.tsx`).
- **Integrated Watcher & Persistence Pipeline Tests:** End-to-end integration tests verifying automated save detection, 3s debounce, snapshot creation, database persistence, and failure blocking (`tests/watcher_and_persistence_pipeline.rs`).
- **Explicit Cloud Upload Shield Inhibition:** Formally verified that zero-byte writes and >80% abrupt size drops are blocked before invoking cloud storage providers.
- **Vitest Coverage Infrastructure:** Configured `@vitest/coverage-v8`, script `pnpm test:coverage`, and `text`, `json-summary`, and `lcov` reports with a 60% minimum threshold.
- **CI Workflow Hardening & Multiplatform Diagnostics:** Added explicit `pnpm build`, `cargo check`, and `pnpm test:coverage` to `.github/workflows/ci.yml` alongside automated failure log extraction.

### Changed
- **Header Optimization & Space Maximization:** Relocated the `+ Add Save` button to the top title bar alongside Google Drive and Settings, removing the platform category filter bar to maximize vertical space for game cards.
- **SQLite Error Precision:** `set_pinned` now returns an explicit error if the targeted snapshot ID does not exist instead of silently ignoring it.

### Fixed
- **Cross-Platform Compilation Gate (`target_os = "macos"`):** Gated Cocoa-specific `tauri::RunEvent::Reopen` behind macOS target conditional compilation to restore clean compilation and passing tests on Linux and Windows.
- **Windows Path UNC Normalization:** Stripped `\\?\` verbatim UNC prefixes in `FsWatcherService` to ensure exact enrolled game path matching across all Windows environments.
- **UpdateBanner Dismiss Cleanup:** Fixed issue where clicking `X` failed to dismiss the banner due to leftover error state; resets all update states on dismissal.
- **Silent Background 404 Suppression:** Prevented red error alerts when background update checks receive 404 or missing release manifests on initial launches.
- **Tauri Bundler Updater Manifests:** Configured `bundle.createUpdaterArtifacts: true` and `uploadUpdaterJson: true` in release workflows.
- **OAuth Loopback Timeout & Error Handling:** Added a 60-second timeout to the ephemeral loopback server and parsed provider error queries (`access_denied`).

## [0.3.0] - 2026-10-22

### Added
- **In-App Auto-Updater (Tauri v2):** Integrated `@tauri-apps/plugin-updater` and `tauri-plugin-updater` with Ed25519 cryptographic signing keypair and automated GitHub Actions release workflow generating `latest.json`.
- **Tactile Update Notification Banner:** Discrete `UpdateBanner` displaying version pills, expandable release notes preview, live download progress, and 1-click update & restart.
- **Manual Update Check:** Added "Check Now" button and update status indicators in `SettingsModal`.
- **Open Community Presets (`presets/*.json`):** Created 10 JSON preset definitions (DuckStation, PCSX2, Dolphin, Ryujinx, Citra, Cemu, RPCS3, RetroArch, Elden Ring, Hollow Knight).
- **Smart Path Auto-Detection:** Automatically resolves tokens (`~`, `%USERPROFILE%`, `%APPDATA%`) and inspects the local filesystem; highlights with a "Found on your system" badge and pre-fills save paths.
- **Community Modding & Custom Presets:** Scans `$APP_DATA/presets` (`~/.local/share/com.memcard.app/presets`) for user custom JSON mods, with a 1-click "Presets Mod Folder" link.
- **Native File & Directory Picker:** Integrated `tauri-plugin-dialog` in `AddGameModal` allowing users to browse their native filesystem instead of manual typing.
- **Delete Game Confirmation Modal:** Safety confirmation dialog (`DeleteGameModal`) with checkbox to optionally preserve or purge snapshot history.
- **Production Google Drive PKCE Flow:** Desktop browser OAuth flow with ephemeral loopback server on port `8085` and offline fallback.

### Changed
- **Complete Rebranding to MemCard:** Project, binary crate, and library completely rebranded from "MemCard Cloud" to "MemCard" across all crates, configs, UI labels, release workflows, and specs.
- **Platform Filter Navigation:** Added default "ALL" tab to view all enrolled game saves across every platform at once.
- **macOS Window Frame:** Switched to native Cocoa traffic lights (`titleBarStyle: "Overlay"`) with natural drop shadows.
- **Cursor Affordance:** Explicit clickable pointer styling (`cursor-pointer`) applied to all interactive controls and buttons.

### Fixed
- Fixed background opacity flashing and animation cycling in main window.
- Fixed square clipped shadow artifacts behind settings and modal backdrops.
- Fixed stale form state retention when switching between presets in `AddGameModal`.

## [0.2.1] - 2026-10-21

### Fixed
- Fixed runtime panic on macOS startup where `tokio::spawn` was invoked from the Cocoa main event loop thread without a thread-local Tokio reactor. Debouncer task now gracefully falls back to `tauri::async_runtime::spawn`.
- Configured recursive ad-hoc code signing (`signingIdentity: "-"`) in `tauri.conf.json` ensuring macOS Apple Silicon bundles have sealed resources and valid bundle signatures out-of-the-box.
- Added comprehensive Gatekeeper and first-launch guidance in `README.md` and release notes for unnotarized open-source macOS distributions.

## [0.2.0] - 2026-10-21

### Added
- Real-time `FsWatcherService` integration wired directly into Tauri application lifecycle and state.
- Automatic dynamic enrollment and unenrollment of game save paths upon `add_game` and `remove_game`.
- Background Tokio event loop consuming debounced save changes, auto-creating immutable snapshots, and broadcasting push events (`watcher:save-changed` and `shield:corruption-detected`).
- React frontend event listeners in `useGames` hook for real-time game card refreshing, audio chime playback (`playSaveChime`), and Corruption Shield alert handling (`playAlert`).
- Integration tests validating dynamic watcher enrollment and debounced file change detection (`test_add_and_remove_game_with_watcher_enrollment`).
- Autonomous background cloud synchronization loop: automatically streams debounced save snapshot archives to Google Drive when authenticated.
- Tauri push event broadcasting for cloud synchronization lifecycle (`sync:status-changed`) and remote divergence alerts (`sync:conflict-detected`).
- React frontend listeners in `useCloud` and `useGames` for real-time sync progress badges, timestamp updates, and instant `ConflictModal` activation.
- `SnapshotService::get_snapshot_archive_path` helper for clean and deterministic snapshot archive resolution.
- Native desktop OS notifications integration via `tauri-plugin-notification`: discrete save backup notifications and urgent Corruption Shield alerts during gameplay.
- Gamer Mode preference toggle in `SettingsModal` allowing users to silence or activate OS notifications.
- Tauri IPC commands `get_notifications_enabled` and `set_notifications_enabled`.

## [0.1.1] - 2026-10-21

### Added
- Multi-platform automated release packaging via GitHub Actions.
- Automated native distributable builds for macOS (Universal / Apple Silicon & Intel `.dmg`), Windows (NSIS `.exe`), and Linux (`.AppImage`, `.deb`).
- Automated SHA-256 cryptographic checksum manifest generation (`SHA256SUMS.txt`).
- Strict Zero Save Loss pre-restore safety backup enforcement (aborts restoration immediately if backup creation fails, preventing save corruption).
- Mandatory baseline snapshot verification on game enrollment (rejects empty or corrupt saves with automatic database rollback).
- Comprehensive integration test suite for backend safety invariants (`src-tauri/tests/safety_invariants.rs`).
- Full Tauri command handlers integration test suite (`src-tauri/tests/commands_integration.rs`).
- Comprehensive React frontend testing infrastructure with `@testing-library/react`, `@testing-library/user-event`, and `jsdom`.
- Complete test suites covering custom hooks (`useGames`, `useCloud`), interactive modals and drawers (`AddGameModal`, `SnapshotDrawer`, `GameCard`, `ConflictModal`, `SettingsModal`), and application root (`App.tsx`).
- Turbocharged CI pipeline with `Swatinem/rust-cache@v2` and `pnpm/action-setup@v4` store caching across all operating systems.
- Streamlined macOS distribution exclusively targeting modern Apple Silicon (M1/M2/M3/M4) native `.dmg`.
- Enhanced Windows NSIS installer with Start Menu program folder organization.

## [0.1.0] - 2026-10-21

### Added
- 1-Click Google Drive Cloud Sync using zero-friction PKCE and non-sensitive `drive.file` scope.
- Multi-platform CI/CD release packaging pipeline targeting macOS (.dmg for Apple Silicon & Intel), Windows (.exe NSIS), and Linux (.AppImage, .deb).
- Verifiable SHA256 cryptographic manifest generation (`SHA256SUMS.txt`) attached to every published release.
- Ephemeral HTTP loopback server capturing OAuth authorization callback with automatic cleanup.
- Drive save storage organization under `MemCard/Saves/<game_id>/<timestamp>_<hash>.zip`.
- 3-Way Visual Conflict Resolution Modal with side-by-side local vs cloud metadata comparison.
- Three resolution strategies: Keep Local (upload), Use Cloud (safe pre-restore snapshot + download), and Branch / Duplicate into Slot 2.
- Complete Liquid Glass Neo-Skeuomorphic memory card UI with custom chamfer, side grip grooves, and tactile status pills.
- Tauri IPC commands for game enrollment, platform filtering, snapshot creation, version history listing, and atomic restore.
- System Tray lifecycle integration with background minimize-to-tray window hiding (<40 MB RAM RSS footprint).
- Pure Web Audio API retro audio feedback synthesizer (saving triad chime, restore confirms, tactile clicks) with zero static audio files.
- Emulator presets for DuckStation, PCSX2, Dolphin, Ryujinx, RPCS3, and RetroArch.
- Snapshot history drawer with one-click restore and star pinning.
- Embedded SQLite persistence engine (`SqliteDatabase`) with WAL mode, transactions, and index optimizations.
- Implementations of `GameRepository` and `SnapshotRepository` with snapshot pinning support.
- Streaming ZIP snapshot compression and atomic staging restoration (`create_snapshot_zip` and `restore_snapshot_zip`).
- High-level `SnapshotService` orchestrating imutability, pre-restore backups, and retention policy pruning.
- Asynchronous File System Watcher with 3-second inactivity debounce (`notify-rs` + Tokio).
- Deterministic SHA-256 tree hasher for single files and directory saves with path normalization.
- Zero-Byte and Corruption Shield preventing sync of empty or severely damaged (>80% loss) saves.
- Game Running Guard with cross-platform file lock detection.
- Comprehensive test suite covering debouncing, tree hashing, and corruption shield detection.
- Initial project architecture and Spec-Driven Development (SDD) workspace foundation.
- Architectural Decision Records (`ADRs`) for Tauri v2, SQLite, Google Drive PKCE, and Safety Shields.
- IPC commands and events contracts under `specs/contracts/`.
- GitHub issue templates, pull request template with AI transparency checklist, and CI/CD workflow.
- Operational guides for AI coding agents (`AGENTS.md` and `CLAUDE.md`).
- Core safety specifications: Zero-Byte Corruption Shield, Game Running Guard, and Pinned Snapshot retention.
