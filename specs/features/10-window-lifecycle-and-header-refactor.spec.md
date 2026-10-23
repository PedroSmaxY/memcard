# Feature Specification: 10 - macOS Window Lifecycle, Header Optimization & Updater Resiliency

- **ID:** `10`
- **Status:** `Accepted`
- **Author(s):** Pedro H. Novais, Antigravity
- **Created:** 2026-10-22
- **Updated:** 2026-10-22

---

## 1. Context & Motivation
Testing on macOS revealed several ergonomics issues in the desktop shell:
1. **Window Lifecycle / Reopen Inability:** Clicking the red traffic light button hides the window to the tray as intended, but clicking the app icon in the macOS Dock or clicking the top Menu Bar tray icon fails to restore the window.
2. **Titlebar Cursor Usability:** The window header sets `cursor-grab`, which causes a hand cursor over the macOS native traffic light buttons instead of the standard macOS pointer.
3. **Screen Real Estate & Category Friction:** The console category bar (`ALL`, `PS1`, `PS2`, `NINTENDO`, `MODERN`, `PC`) consumes excessive vertical space and introduces ambiguity for native PC decompilation ports.
4. **Auto-Updater Error Handling & Dismiss:** If `latest.json` is missing or remote returns 404, the UI displayed a green "Update Available" banner containing a raw error, and clicking `X` failed to dismiss the banner because `error` remained in state.
5. **Bundler Release Artifacts:** `bundle.createUpdaterArtifacts` was omitted from `tauri.conf.json`, preventing GitHub Actions from generating the signed `latest.json` manifest.

---

## 2. User Stories
- **As a** macOS gamer,
- **I want to** click the MemCard icon in my Dock or the tray icon in the menu bar to reopen the window whenever it is hidden,
- **So that** I can easily access my memory card without restarting the application.

- **As a** player,
- **I want** the title bar to have standard pointer interaction on traffic lights and the `+` action directly accessible in the header,
- **So that** the application feels completely native and provides maximum vertical screen real estate for my games.

- **As a** user,
- **I want** the updater to dismiss cleanly when I click `X` and not show scary error banners on startup when releases are still compiling,
- **So that** my experience is smooth, quiet, and reliable.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Restoring Hidden Window via macOS Dock Click
- **Given** MemCard is running in the background and the main window is hidden
- **When** the user clicks the MemCard icon in the macOS Dock
- **Then** `tauri::RunEvent::Reopen` is handled by the application runner
- **And** the main window is shown, unminimized, and focused on screen.

### Scenario: Restoring Hidden Window via Menu Bar Tray Click
- **Given** MemCard is running in the background and the main window is hidden
- **When** the user left-clicks the tray icon in the system menu bar
- **Then** `TrayIconEvent::Click` is triggered
- **And** the main window is shown, unminimized, and focused on screen.

### Scenario: Standard Cursor on macOS Traffic Lights
- **Given** the MemCard window is visible
- **When** the user hovers over the top-left area where the red/yellow/green buttons reside
- **Then** the cursor is the standard macOS arrow pointer (`cursor-default`)
- **And** `data-tauri-drag-region` is set to `false` for that 80px region.

### Scenario: Header Streamlining and Category Tabs Removal
- **Given** the main application layout
- **When** the user views the window
- **Then** no console category navigation bar is rendered
- **And** the `+ Add Game` button is located in the top header next to Drive status and Settings
- **And** the entire body area renders all enrolled game cards.

### Scenario: Dismissing Update Banner Cleanly
- **Given** an update banner is displayed
- **When** the user clicks the `X` (Dismiss) button
- **Then** `available`, `error`, and `statusMessage` are all reset to null/false
- **And** the banner disappears immediately from the DOM.

### Scenario: Background Update Check with Remote 404
- **Given** the app boots up and checks for updates in the background
- **When** the remote `latest.json` returns 404 or network is temporarily unavailable
- **Then** the check catches the error silently
- **And** no error banner or green notification is presented to the user.

---

## 4. Architecture & Interface Contracts

### macOS Lifecycle & Tray Integration
```rust
// src-tauri/src/lib.rs
.on_tray_icon_event(|tray, event| {
    if let tauri::tray::TrayIconEvent::Click {
        button: tauri::tray::MouseButton::Left,
        button_state: tauri::tray::MouseButtonState::Up,
        ..
    } = event {
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
})

// Application Runner
app.run(|app_handle, event| {
    if let tauri::RunEvent::Reopen { .. } = event {
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
});
```

---

## 5. Automated Verification Plan
1. **Unit & Component Tests:**
   - `src/features/updater/UpdateBanner.test.tsx`: test that `onDismiss` cleanly removes banner.
   - `src/hooks/useUpdater.test.ts`: test silent background failure handling on 404.
   - `src/App.test.tsx`: test new header with `+ Add Game` button and verified absence of category tabs.
2. **Compilation & Formatting:**
   - `cargo check`, `cargo fmt --check`, `cargo clippy -- -D warnings`.
   - `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.
3. **Playwright Visual Verification:**
   - Verify layout, traffic lights hover, header layout, and capture screenshots.
