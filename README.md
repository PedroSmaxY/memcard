# MemCard Cloud 🎮💾

[![CI](https://github.com/memcard-cloud/memcard-cloud/actions/workflows/ci.yml/badge.svg)](https://github.com/memcard-cloud/memcard-cloud/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://v2.tauri.app/)
[![Spec-Driven Development](https://img.shields.io/badge/Methodology-SDD-purple.svg)](./specs)

> An ultra-lightweight (< 40 MB RAM), neo-skeuomorphic tactile memory card utility for automated save versioning, corruption prevention, and 1-click cloud synchronization across PCs, handhelds, and retro emulators.

---

## ✨ Features

- **🛡️ Total Save Protection:**
  - **Zero-Byte & Corruption Shield:** Detects crash-induced empty or damaged save files and halts cloud sync to preserve clean backups.
  - **Game Running Guard:** Verifies file locks and active processes before allowing any version restoration.
  - **Immutable Snapshots:** Guarantees atomic `.zip` snapshots before any cloud sync or local overwrite.
- **⚡ 1-Click Cloud Sync (Google Drive):**
  - Instant login using native PKCE desktop OAuth via an ephemeral loopback server.
  - Uses the non-sensitive `drive.file` scope (zero security friction; touches only its dedicated folder: `MemCardCloud/Saves`).
- **🎛️ 3-Way Visual Conflict Resolution:**
  - Clear side-by-side modal allowing users to keep local, use cloud, or duplicate into a new branch/slot.
- **🕹️ Console-Themed Tactile UI:**
  - Translucent liquid glass memory card interface supporting 5 platform ecosystems: **PlayStation 1**, **PlayStation 2**, **Nintendo**, **Modern (RPCS3/Switch)**, and **PC Ports**.
  - Synthesized retro audio feedback generated in real time with the Web Audio API (0 KB media assets).
  - Background System Tray integration with silent Gamer Mode.
- **📜 Spec-Driven Development (SDD):**
  - Living specifications in [`specs/`](./specs) serve as the single source of truth for all implementations and PRs.

---

## 🏗️ Architecture

```
                               +-----------------------------+
                               |  Translucent Tactile Window |
                               |     (React 19 + Tailwind)   |
                               +--------------+--------------+
                                              | Tauri IPC Commands
                                              v
+---------------------------------------------------------------------------------------+
|  Rust Core (Tokio Async Runtime)                                                      |
|                                                                                       |
|   +--------------------+     +---------------------+     +------------------------+   |
|   |  FS Watcher        |     |  Snapshot Engine    |     |  Cloud Sync Provider   |   |
|   |  (notify-rs + 3s   | --> |  (Atomic ZIP +      | <-> |  (Google Drive REST    |   |
|   |   Debounce + Hash) |     |   SQLite History)   |     |   + PKCE Loopback)     |   |
|   +--------------------+     +---------------------+     +------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0
- `pnpm` >= 9.0
- Rust toolchain (`cargo`, `rustc`)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/memcard-cloud/memcard-cloud.git
cd memcard-cloud

# Install frontend dependencies
pnpm install

# Run in development mode with Tauri
pnpm tauri dev
```

---

## 🤝 Contributing

We follow **Spec-Driven Development (SDD)** and uphold transparent AI collaboration standards.
Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md) before submitting pull requests.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
