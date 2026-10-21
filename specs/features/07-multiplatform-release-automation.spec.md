# Feature Specification: 07 - Multiplatform Distributable Packaging & Release Automation

- **ID:** `07`
- **Status:** `Implemented`
- **Author:** MemCard Cloud Team
- **Created:** 2026-10-21
- **Updated:** 2026-10-21

---

## 1. Context & Motivation
To provide seamless installation for end users across desktop gaming environments (macOS, Windows, Steam Deck / Linux), MemCard Cloud provides automated CI/CD release packaging. Every new semantic release automatically compiles native distributables (`.dmg`, `.exe`, `.AppImage`, `.deb`) and calculates verifiable cryptographic SHA-256 manifests.

---

## 2. User Stories
- **As an** end user playing on Mac, Windows PC, or Steam Deck,
- **I want** pre-packaged, native executable installers and portables attached directly to each release,
- **So that** I can install or run MemCard Cloud with one click without compiling from source.

---

## 3. Acceptance Criteria (Gherkin Syntax)

### Scenario: Automated Multi-Platform Release Packaging
- **Given** a new version tag (e.g. `v0.2.0`) pushed to GitHub or triggered via `workflow_dispatch`
- **When** the `release.yml` GitHub Actions workflow triggers
- **Then** a matrix builds native binaries across:
  - macOS (Apple Silicon `aarch64` native for M1/M2/M3/M4) into a `.dmg` installer
  - Windows (`x64`) into an NSIS installer (`.exe`) with Start Menu organization
  - Linux (`x64`) into a portable `.AppImage` and Debian `.deb` package with SteamOS integration
- **And** all distributables are uploaded directly to the GitHub Release.

### Scenario: Verifiable Cryptographic Checksum Manifest
- **Given** all platform build jobs have completed and uploaded their binaries
- **When** the downstream `checksums` job runs
- **Then** it downloads all binary assets from the GitHub Release
- **And** generates a standard `SHA256SUMS.txt` manifest containing cryptographic hashes of all distributables
- **And** uploads `SHA256SUMS.txt` to the release assets for tamper verification.
