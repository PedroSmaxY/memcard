# Feature Specification: 03 - 1-Click Google Drive Cloud Sync

- **ID:** `03`
- **Status:** `Implemented`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
Gamers switch between desktop PCs, handheld devices (Steam Deck, ROG Ally), and laptops. Cloud synchronization must work seamlessly without manual API keys or Google Cloud setup. It uses an ephemeral loopback HTTP server with PKCE and the non-sensitive `drive.file` scope.

---

## 2. User Stories
- **As a** gamer,
- **I want** to click one button to connect my Google Drive,
- **So that** my saves are automatically synchronized across all my devices without manual file copying.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: 1-Click PKCE Authentication
- **Given** an unauthenticated state
- **When** the user clicks "Connect with Google"
- **Then** Rust spins up an ephemeral HTTP server on `http://127.0.0.1:[port]/oauth/callback`
- **And** opens the default browser with the OAuth URL using scope `https://www.googleapis.com/auth/drive.file`
- **And** upon approval, captures the authorization code, exchanges it for tokens, and terminates the loopback server.

### Scenario: Remote Folder Organization
- **Given** an authenticated session
- **When** snapshots are synchronized
- **Then** files are organized in the user's visible Drive under `MemCardCloud/Saves/<game_id>/<timestamp>_<hash>.zip`.
