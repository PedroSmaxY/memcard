# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Drive save storage organization under `MemCardCloud/Saves/<game_id>/<timestamp>_<hash>.zip`.
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
