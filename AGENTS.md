# AGENTS.md - Agent & AI Collaboration Guide

This document defines operational guidelines, code standards, and invariants for all AI coding assistants (including Antigravity, Claude Code, Cursor, GitHub Copilot Workspace, and others) working in the **MemCard Cloud** repository.

---

## 1. Prime Invariants (Never Violate)

1. **Safety First (Zero Save Loss):**
   - **Never overwrite an active game save without creating an atomic, verified local snapshot first.**
   - **Never bypass the `Game Running Guard`:** If a file lock or open process is detected, refuse destructive actions and alert the user.
   - **Never upload corrupted saves:** The `Zero-Byte & Corruption Shield` must block cloud uploads if a save file drops to 0 bytes or abruptly decreases by >80%.
2. **100% English Codebase:**
   - All code, identifiers, types, comments, docstrings, commits, PRs, issue templates, and specs must be written in English.
3. **Spec-Driven Development (SDD):**
   - Code changes must link to an accepted specification in `/specs/features/`.
   - Any modifications to Tauri IPC commands or push events must update `/specs/contracts/` in the same commit.
4. **AI Transparency & Attribution:**
   - Every git commit created with AI assistance must include the git trailer:
     `Co-authored-by: <AgentName> <agent-email>`
   - Every Pull Request description must check the AI transparency box in `.github/pull_request_template.md`.

---

## 2. Architecture & Design Principles

The project adheres to **Clean Architecture / Hexagonal Architecture** in Rust:
- `src-tauri/src/core/domain/`: Pure models (`Game`, `SaveFile`, `Snapshot`, `SyncConflict`). Zero dependencies on Tauri or SQLite.
- `src-tauri/src/core/ports/`: Interfaces/Traits (`CloudStorageProvider`, `SnapshotRepository`, `GameRepository`).
- `src-tauri/src/core/services/`: Pure business use cases (`WatcherService`, `SnapshotService`, `RetentionService`).
- `src-tauri/src/adapters/`: Concrete implementations (SQLite, notify-rs, ZIP streaming, Google Drive REST client).
- `src-tauri/src/commands/`: Thin Tauri IPC layer translating frontend requests to domain services.

The frontend uses **React 19 + TypeScript + Tailwind CSS v4**:
- Modular structure under `src/features/` (`games`, `snapshots`, `sync`, `settings`).
- Tactile, neo-skeuomorphic dark liquid glass visual style (`decorations: false`, `transparent: true`).
- Audio feedback synthesized exclusively via Web Audio API (zero bulky media files).

---

## 3. Essential Commands

### Frontend
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Run tests: `pnpm test`
- Typecheck: `pnpm typecheck`
- Linter: `pnpm lint`

### Backend (Rust)
- Check compilation: `cargo check`
- Format check: `cargo fmt --check`
- Strict linting: `cargo clippy -- -D warnings`
- Run test suite: `cargo test --all`

### Tauri
- Run full app: `pnpm tauri dev`
- Build app: `pnpm tauri build`

---

## 4. Branch & Commit Conventions
- Branches: `feat/<spec-id>-<slug>`, `fix/<issue-id>-<slug>`, `chore/<slug>`.
- Commits: Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`).
