# Feature Specification: 05 - Liquid Glass UI & System Tray Lifecycle

- **ID:** `05`
- **Status:** `Accepted`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Gamers value immersion and aesthetics. MemCard Cloud departs from sterile corporate flat design, using a tactile neo-skeuomorphic translucent dark glass (*liquid glass*) memory card silhouette. It must run unobtrusively in the background (< 40 MB RAM) with an OS tray icon and Gamer Mode notifications.

---

## 2. User Stories
- **As a** gamer,
- **I want** the app to feel like a premium physical memory card on my desktop,
- **So that** it closes to the tray without interrupting my games while keeping my saves protected.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Frameless Window & Chamfer Silhouette
- **Given** the application starts
- **Then** the window renders with `transparent: true` and `decorations: false`
- **And** displays the classic memory card top-right chamfer and side grip grooves
- **And** is draggable via the header region (`data-tauri-drag-region`).

### Scenario: System Tray & Memory Footprint
- **Given** the user closes or minimizes the window
- **Then** the window hides to the System Tray instead of terminating the process
- **And** background RSS RAM usage remains strictly under 40 MB
- **And** the tray icon context menu provides "Open", "Sync Now", and "Quit".
