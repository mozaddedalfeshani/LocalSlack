# SwiftShare

SwiftShare is an open-source desktop app for fast local Wi-Fi file sharing. It is inspired by LocalSend and built with React, TypeScript, Rust, and Tauri v2.

Repository: https://github.com/mozaddedalfeshani/swiftshare

বাংলা ডকুমেন্টেশন: [README.bn.md](README.bn.md)

## Features

- Send files, folders, images, media, and text over the local network.
- Receive files without an internet connection or central server.
- Nearby-device discovery for same Wi-Fi/LAN devices.
- Clipboard text send and receive.
- Favorites for pinned devices.
- Transfer history with sent and received entries.
- Dark, light, and system themes.
- English and Bangla language support.
- Cross-platform desktop builds for Windows, macOS, and Linux.

## Tech Stack

- Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion
- State: Zustand
- Desktop: Tauri v2
- Backend: Rust, Tokio, Axum, Reqwest
- Discovery and storage: mDNS, Sled
- Tests: Vitest, React Testing Library, Rust tests

## Development

Install dependencies:

```bash
bun install
```

Run the desktop app:

```bash
bun run tauri:dev
```

Run frontend tests:

```bash
bun run test
```

Build the frontend:

```bash
bun run build
```

Build desktop bundles:

```bash
bun run tauri:build
```

## Linux Requirements

On Ubuntu/Debian, install the Tauri system dependencies first:

```bash
sudo apt-get update
sudo apt-get install -y libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev pkg-config
```

## Releases

GitHub Actions builds installers when a tag like `v0.1.0` is pushed, or when the release workflow is run manually.

Release assets:

- Linux: `.deb`
- macOS: `.dmg`
- Windows: `.exe`

The release workflow creates a draft release and attaches the installers with release notes.

## License

Open source. Add your preferred license file before publishing a stable release.
