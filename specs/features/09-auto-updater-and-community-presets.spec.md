# Feature Specification: 09 - In-App Auto-Updater, Community Presets & Google Drive Production

- **ID:** `09`
- **Status:** `Draft`
- **Author:** MemCard Team
- **Created:** 2026-10-22
- **Updated:** 2026-10-22

---

## 1. Context & Motivation
To transition MemCard into a mature, self-sustaining desktop application, three major infrastructure pieces are required:
1. **Autonomous In-App Updates:** Users should never have to manually visit GitHub Releases to download installers for patch updates. The app must detect new releases, show changelogs, and self-update with one click.
2. **Community Presets & Modding:** Hardcoded presets limit extensibility. Emulators and native PC games store saves in well-known OS-specific locations. Externalizing presets into simple, schema-validated JSON files allows contributors to submit new presets via GitHub PRs and power users to drop custom preset mods into a local directory.
3. **Smart Save Detection:** When a preset has known default paths for macOS, Windows, or Linux, the app should verify whether the path exists on disk and display an "Encontrado / Found" badge for 1-click enrollment.
4. **Google Drive Production Authentication:** Transitioning from the mock provider to real OAuth 2.0 PKCE desktop authentication with a factory default client and optional custom client settings.

---

## 2. Acceptance Criteria (Gherkin Syntax)

### Scenario: In-App Auto-Update Notification & Execution
- **Given** a new release is published to GitHub with release notes
- **When** the application starts or the user clicks "Check for Updates" in Preferences
- **Then** the application queries `latest.json` from the releases endpoint
- **And** displays a discrete liquid-glass banner with the new version tag and changelog body
- **And** clicking "Update & Relaunch" downloads the delta patch and restarts the application seamlessly.

### Scenario: Schema-Driven Community & Mod Presets
- **Given** the presets directory contains individual `.json` definitions (e.g. `duckstation.json`, `pcsx2.json`, `hollow_knight.json`)
- **When** the application boots or the Add Game modal opens
- **Then** the presets registry aggregates built-in repository presets and any custom `.json` files placed in the user's local `presets/` folder
- **And** provides an "Import / Export Preset" option in the UI.

### Scenario: Smart Local Save Auto-Detection
- **Given** an emulator or native game preset defines default OS paths for `macos`, `windows`, and `linux`
- **When** the user opens the Add Game modal
- **Then** the backend checks if any of the default paths exist on the local filesystem
- **And** decorates matching presets with a green "Encontrado no seu sistema" badge
- **And** auto-populates the path input with the existing save file upon selection.

### Scenario: Production Google Drive Login & Token Persistence
- **Given** the user clicks "Connect Drive"
- **When** initiating OAuth 2.0 PKCE authentication
- **Then** the default system browser opens the Google Consent screen for `drive.file` scope
- **And** the ephemeral loopback server captures the authorization code
- **And** the refresh token is securely stored in local app state, maintaining authentication across app restarts.
