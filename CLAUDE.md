# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

LocalSlack is a cross-platform desktop application for fast local Wi-Fi file sharing built with React, TypeScript, Tauri v2, and Rust. It enables users to send/receive files, folders, images, text, and manage transfer history without internet connectivity.

## Development Commands

### Frontend Development

- `bun install` — Install dependencies
- `bun run dev` — Run Vite dev server (port 1420)
- `bun run build` — Build frontend with TypeScript check and Vite
- `bun run test` — Run Vitest test suite
- `bun run preview` — Preview built frontend

### Desktop App Development

- `bun run tauri:dev` — Run the complete Tauri desktop app with hot reload
- `bun run tauri:build` — Build production desktop bundles (macOS: `.dmg`, Linux: `.deb`, Windows: `.exe`)
- `bun run tauri` — Run Tauri CLI directly for advanced commands

### Rust-Specific Commands

- `cargo test --manifest-path src-tauri/Cargo.toml` — Run Rust backend tests
- `cargo build --release --manifest-path src-tauri/Cargo.toml` — Build Rust backend in release mode

## Architecture Overview

### Frontend Stack

- **UI Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **State Management**: Zustand (lightweight client state)
- **Animation**: Framer Motion
- **Testing**: Vitest + React Testing Library
- **Internationalization**: i18next (English, Bangla)
- **Desktop Bridge**: Tauri API (`@tauri-apps/api`)

### Backend Stack

- **Runtime**: Tokio async runtime
- **Web Server**: Axum for HTTP handling
- **HTTP Client**: Reqwest for outbound requests
- **Network Discovery**: mDNS (multicast DNS) for device detection
- **Local Storage**: Sled (embedded key-value store) for history, settings, favorites
- **Cryptography**: sha2, rustls for TLS
- **Clipboard**: arboard for clipboard access
- **Platform Integration**: Tauri commands for frontend-backend communication

### Frontend Architecture

**Directory Structure**:

- `src/components/` — UI components organized by feature (send, receive, transfer, history, settings, etc.)
- `src/hooks/` — Custom React hooks for state management (useDevices, useTransfer, useSettings, useFavorites)
- `src/store/` — Zustand stores (deviceStore, transferStore, settingsStore, uiStore)
- `src/utils/` — Helper functions (fileUtils, deviceUtils, formatUtils, windowAttention)
- `src/types/` — TypeScript type definitions
- `src/i18n/` — Internationalization configuration
- `src/__tests__/` — Unit and component tests

**Key Patterns**:

- **State Management**: Zustand stores are minimal; most state lives in custom hooks that interact with Tauri commands
- **Tauri Commands**: All backend interactions use `invoke()` from `@tauri-apps/api/core` (see `src/App.tsx` for examples)
- **Component Composition**: Functional components with hooks; feature components (Send/Receive) live in `MainLayout`

### Backend Architecture

**Core Modules** (in `src-tauri/src/`):

- `server.rs` — Axum HTTP server for receiving files/text; listens on a random port
- `sender.rs` — Handles outbound file/text transfers to other devices
- `discovery.rs` — mDNS-based device discovery and local device advertisement
- `models.rs` — Shared data structures (DeviceInfo, Transfer, NetworkStatus, etc.)
- `history.rs` — Persistent storage of transfer history (using Sled)
- `favorites.rs` — Favorite devices store
- `settings.rs` — User settings and application configuration
- `clipboard.rs` — Clipboard send/receive functionality
- `crypto.rs` — Certificate generation and TLS setup

**Key Design**:

- **AppState** (`src-tauri/src/lib.rs`): Central state struct holding discovery, history, favorites, settings, and transfer state
- **Tauri Commands**: Async functions decorated with `#[tauri::command]` for frontend invocation
- **Event Emission**: Some operations emit Tauri events back to the frontend (e.g., transfer progress)
- **Persistence**: Sled database for history, favorites, and settings

## Workflow Overview

### File Send Flow

1. User selects files in Send UI (`SendHome` component)
2. Frontend invokes `send_files` Tauri command
3. Rust backend makes HTTP request to target device's server
4. Progress updates emitted via Tauri events back to React
5. Transfer recorded in history store

### File Receive Flow

1. Device's Axum server receives HTTP POST with files
2. Backend emits `incoming_transfer` event to frontend
3. Frontend shows `ReceiveDialog` modal
4. User accepts/rejects transfer
5. Files saved to configured download location; history updated

### Device Discovery

1. On app launch, discovery module advertises this device via mDNS
2. Discovery continuously listens for other LocalSlack devices
3. `useDevices` hook polls `get_devices()` Tauri command
4. UI displays nearby devices; manual network scan available

## Testing

### Frontend Testing

- Test files colocated in `src/__tests__/` with `.test.tsx` suffix
- Use `vi.mock()` for mocking Tauri API calls
- Default test setup loads from `src/testSetup.ts` (jsdom environment)
- Run single test: `bun run test -- FileDropZone.test.tsx`

### Backend Testing

- Test modules in `src-tauri/src/tests/`
- Use `#[tokio::test]` for async tests
- Mocking with `mockall` for trait-based mocks
- Temp files with `tempfile` crate

## Build & Release

### Local Development

- `tauri:dev` rebuilds the Rust binary, serves frontend from Vite dev server, and hot-reloads on changes
- Windows/Linux require additional system dependencies (see `README.md`)

### Production Build

- `tauri:build` compiles frontend to `dist/`, then bundles with Rust binary
- Outputs platform-specific installers
- Release workflow (GitHub Actions) triggers on git tags like `v0.1.0`

## Key Implementation Details

### Network Configuration

- Server listens on `0.0.0.0` with auto-assigned port (advertised via mDNS)
- TLS certificates auto-generated on first run
- mDNS service type: `_localslack._tcp.local.`

### State Synchronization

- Frontend polls `get_devices()` and `get_pending_incoming()` periodically
- Transfer events broadcasted to UI via `listen()` from Tauri
- Settings changes trigger `set_receive_mode_active()` to update mDNS visibility

### Multi-Platform Considerations

- Tauri handles cross-platform window/system tray integration
- File paths use `dirs` crate for OS-specific app data dirs
- Platform-specific bundle config in `tauri.conf.json` (deb, dmg, nsis)

## TypeScript Strict Mode

The project uses `"strict": true` in `tsconfig.json`. All TypeScript code must be type-safe; no implicit `any`.

## Common Tasks

### Adding a New Setting

1. Add field to `AppSettings` struct in `src-tauri/src/models.rs`
2. Add Tauri command in `src-tauri/src/lib.rs` (e.g., `set_app_setting()`)
3. Add Zustand store property in `src/store/settingsStore.ts`
4. Add UI control in `src/components/settings/SettingsPage.tsx`
5. Wire up `invoke()` call in the settings hook

### Adding a Feature That Sends/Receives Data

1. Add HTTP route to `src-tauri/src/server.rs` for receive endpoint
2. Add sender function in `src-tauri/src/sender.rs`
3. Add Tauri command in `src-tauri/src/lib.rs` to trigger the send
4. Add React component in `src/components/`
5. Invoke command from component via `invoke()` and handle response
6. Emit Tauri event for progress/completion if needed

## Debugging

### Frontend

- Use browser DevTools (Right-click → Inspect in Tauri dev mode)
- Vite dev server runs on `localhost:1420`
- `console.log()` appears in both browser DevTools and terminal

### Backend

- Add tracing statements (see `tracing` crate in `Cargo.toml`)
- Check Tauri console output in terminal running `tauri:dev`
- Rust panic backtraces: `RUST_BACKTRACE=1 bun run tauri:dev`
