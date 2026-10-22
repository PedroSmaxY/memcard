# Feature Specification: 08 - UI Polishing, Native Window Controls & UX Ergonomics

- **ID:** `08`
- **Status:** `Draft`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Following real-world testing on macOS, several visual and ergonomic friction points were identified:
1. Transparency flickering and background opacity shifting caused by WebKit backdrop blur re-compositing against the OS desktop.
2. Unwanted visual elements (3 side grip holes and a pointy cut-out corner in the top right with faint ghost borders).
3. Inability to drag the window reliably or close it directly from the window chrome.
4. Absence of a native system file browser (`@tauri-apps/plugin-dialog`) for selecting emulator saves/directories.
5. Accidental deletion risk without a styled in-app confirmation dialog.
6. Sticky form state when switching between emulator presets.

---

## 2. Acceptance Criteria (Gherkin Syntax)

### Scenario: Stable Dark Glass Shell & Organic Silhouette
- **Given** the application window is rendered
- **Then** the background opacity remains rock-solid without flickering (`#12141a` / `rgba(18, 20, 26, 0.96)`)
- **And** the top-right diagonal polygon cut-path is removed in favor of organic, uniform rounded corners (`rounded-2xl`)
- **And** the 3 right-side grip grooves are completely eliminated from the DOM.

### Scenario: Native macOS Window Controls & Full Drag Region
- **Given** the top header is rendered
- **Then** native macOS-styled traffic light buttons (Red close, Yellow minimize) appear on the top-left
- **And** clicking the Red button hides the window to the System Tray (`window.hide()`)
- **And** clicking the Yellow button minimizes the window (`window.minimize()`)
- **And** the entire empty top bar functions as `data-tauri-drag-region`, allowing instant window repositioning.

### Scenario: Native File Picker for Save Files and Folders
- **Given** the user opens the "Enroll Game Save" modal
- **When** the user clicks "Browse Save..."
- **Then** the native OS file picker (`open()` from `@tauri-apps/plugin-dialog`) is triggered
- **And** opens in file mode (e.g. `.mcd`, `.srm`, `.sav`) or folder mode automatically based on the selected emulator preset.

### Scenario: Dynamic Emulator Preset Switching
- **Given** the user selects an emulator preset in the Add Game modal
- **When** switching from one preset (e.g. DuckStation) to another (e.g. PCSX2)
- **Then** the game name and expected file template update immediately
- **And** the previous custom path is cleared to avoid cross-emulator misconfiguration.

### Scenario: Styled Safe Delete Confirmation Modal
- **Given** the user clicks the trash icon on a game card
- **Then** an in-app styled modal appears asking for explicit confirmation
- **And** provides an optional checkbox: *"Also delete historical backup snapshots from disk"*
- **And** only executes deletion upon user confirmation.
