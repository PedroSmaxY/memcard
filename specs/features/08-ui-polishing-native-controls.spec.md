# Feature Specification: 08 - UI Polishing, Native Window Controls & UX Ergonomics

- **ID:** `08`
- **Status:** `Implemented`
- **Author:** MemCard Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Following real-world testing on macOS, several visual and ergonomic friction points were identified:
1. Transparency flickering and square ghost borders caused by frameless transparent window compositing.
2. In-app simulated window buttons looking out-of-place compared to native system controls.
3. Absence of a native system file browser (`@tauri-apps/plugin-dialog`) due to missing Tauri v2 capabilities.
4. Non-standard clickable cursors on interactive buttons across the application.
5. Branding clarity: abandoning "Cloud" and "01" in favor of the clean product name **MemCard**.
6. Category navigation: lack of an "ALL" tab to view all enrolled saves across platforms.
7. Visual clutter: redundant long file paths and overly prominent shield indicators on game cards.

---

## 2. Acceptance Criteria (Gherkin Syntax)

### Scenario: Native Multi-Platform Window Controls & Solid Canvas
- **Given** the application starts
- **Then** the window uses native decorations with `titleBarStyle: "Overlay"` and `hiddenTitle: true` on macOS
- **And** native Cocoa traffic lights are rendered on macOS with native window drop-shadows and corner radius
- **And** the background uses a solid, non-flickering `#12141a` dark glass palette
- **And** all buttons, tabs, and interactive elements display `cursor: pointer`.

### Scenario: Native File Picker for Save Files and Folders
- **Given** the user opens the "Enroll Game Save" modal
- **When** the user clicks "Browse..."
- **Then** `dialog:default` capabilities grant permission and the native Finder/Explorer file dialog opens.

### Scenario: Rebranding & Navigation
- **Given** the header is rendered
- **Then** the title displays clean uppercase `MEMCARD`
- **And** the platform navigation bar renders `ALL` as the first and default selected tab.

### Scenario: Ultra-Clean Game Cards & Subdued Footer
- **Given** games are listed on the main dashboard
- **Then** the redundant save file path is hidden from the main card view (retaining tooltip accessibility)
- **And** the status badge displays a minimal green dot with `Protected`
- **And** the footer displays a discreet `Shield Active` indicator.
