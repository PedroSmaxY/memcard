# Spec-Driven Development (SDD) Guide

Welcome to the **MemCard** specification registry. In this repository, specifications are versioned, living artifacts that dictate architecture, user experience, IPC contracts, and automated tests.

---

## 📁 Directory Structure

```
specs/
├── README.md                      # This guide
├── template.spec.md               # Standard template for authoring new feature specs
├── adrs/                          # Architectural Decision Records (ADRs)
│   ├── 0001-tauri-v2-and-react19.md
│   ├── 0002-sqlite-embedded-metadata.md
│   ├── 0003-google-drive-zero-friction-pkce.md
│   └── 0004-safety-shields-and-retention.md
├── contracts/                     # Formal contracts between Rust and Frontend
│   ├── tauri-commands.contract.md # Typed Tauri IPC signatures
│   └── events.contract.md         # Asynchronous push events
└── features/                      # Concrete feature specifications
    ├── 01-fs-watcher-debounce.spec.md
    ├── 02-snapshot-zip-engine.spec.md
    ├── 03-cloud-sync-gdrive.spec.md
    ├── 04-conflict-resolution-flow.spec.md
    ├── 05-liquid-glass-ui-tray.spec.md
    ├── 06-safety-shields-and-retention.spec.md
    ├── 07-multiplatform-release-automation.spec.md
    ├── 08-ui-polishing-native-controls.spec.md
    ├── 09-auto-updater-and-community-presets.spec.md
    └── 10-window-lifecycle-and-header-refactor.spec.md
```

---

## 🔄 The SDD Lifecycle

Every feature specification moves through distinct lifecycle states documented in its frontmatter:

1. **`Draft`**: The proposal is under active authoring and exploration.
2. **`In Review`**: Ready for feedback from maintainers or community.
3. **`Accepted`**: Approved architecture, ready for implementation.
4. **`Implemented`**: Code and tests are merged to `main`.
5. **`Superseded`**: Replaced by a newer specification.

---

## ✍️ How to Author a Spec

1. Copy `specs/template.spec.md` into `specs/features/<number>-<slug>.spec.md`.
2. Clearly define the **Problem**, **User Stories**, and **Acceptance Criteria** using Gherkin (*Given-When-Then*) syntax.
3. If new Tauri commands or events are needed, update `specs/contracts/`.
4. Open a PR with the label `spec`.
