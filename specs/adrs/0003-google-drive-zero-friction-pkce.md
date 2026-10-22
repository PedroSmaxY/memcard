# ADR 0003: Zero-Friction Google Drive OAuth2 with PKCE and `drive.file` Scope

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Pedro H. Novais, Antigravity

---

## Context
A major barrier for desktop sync utilities is complex cloud onboarding (requiring users to create Google Cloud projects, manage API keys, copy-paste authorization codes, or face scary "Unverified App" warning screens). We require a true 1-click login flow that is secure, compliant with RFC 8252 (OAuth 2.0 for Native Apps), and completely frictionless for end users.

---

## Decision
1. **PKCE Flow with Ephemeral Loopback Server:**
   - The user clicks **"Connect with Google"**.
   - Rust generates PKCE (`code_verifier` and `code_challenge`) and starts a temporary local HTTP loopback server on `http://127.0.0.1:[random_port]/oauth/callback`.
   - The system browser opens Google's OAuth consent endpoint.
   - Upon consent, Google redirects to the local loopback server with the authorization code.
   - Rust exchanges the code for `access_token` and `refresh_token`, terminates the loopback server, and returns a sleek "Success" page to the browser.
2. **Non-Sensitive Scope (`drive.file`):**
   - We request only `https://www.googleapis.com/auth/drive.file`.
   - **Crucial Benefit:** Google classifies `drive.file` as non-sensitive. It grants access solely to files created or opened by MemCard in `My Drive/MemCard/Saves`.
   - Bypasses annual third-party CASA security verification and eliminates red "Dangerous/Unverified App" warnings.

---

## Consequences
- **Positive:**
  - True 1-click user onboarding.
  - Zero Google Cloud Console complexity for gamers.
  - Least-privilege security principle: MemCard can never access personal photos, emails, or personal Drive documents.
- **Negative:**
  - Requires handling OS firewall dialogs on Windows for the local loopback port (standard for desktop apps).
