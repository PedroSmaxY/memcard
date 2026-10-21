# ADR 0001: Adoption of Tauri v2, Tokio, React 19, and Tailwind CSS v4

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Pedro H. Novais, Antigravity

---

## Context
MemCard Cloud needs to run silently in the background while users play resource-intensive games and emulators. Memory footprint must be constrained strictly to under 40 MB of RAM, with zero UI freezing during disk I/O, hashing, or cloud synchronization. Furthermore, the application requires a custom frameless window (`decorations: false`, `transparent: true`) replicating a tactile neo-skeuomorphic translucent dark glass (*liquid glass*) memory card.

---

## Decision
1. **Desktop Engine:** We adopt **Tauri v2** with a pure Rust core running on Tokio async runtime.
   - Tauri v2 uses the native OS webview (WebKit on macOS, WebView2 on Windows) rather than bundling a heavy Chromium browser, keeping RAM well under the 40 MB threshold.
   - Rust ensures memory safety, deterministic low-level file system control, and zero garbage collection spikes.
2. **Frontend Stack:** We adopt **React 19 + TypeScript + Vite + Tailwind CSS v4**.
   - Tailwind CSS v4 provides cutting-edge CSS backdrop filters and hardware-accelerated translucent styling with zero CSS runtime overhead.
   - TypeScript guarantees end-to-end typed contract synchronization with Rust models.

---

## Consequences
- **Positive:**
  - Background idle memory footprint is typically 15–30 MB.
  - Native window transparency and system tray APIs are fully supported in Tauri v2.
  - Tokio async engine handles debounced I/O and SHA-256 tree hashing on background worker threads without stuttering the UI.
- **Negative:**
  - Requires Rust compiler setup on developer machines.
