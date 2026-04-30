# LocalSlack

LocalSlack is a local-first desktop collaboration app for teams on the same Wi-Fi or LAN. It brings Slack-like public channels, messages, asset sharing, and offline catch-up sync to a peer-to-peer desktop app without requiring the internet or a central cloud server.

Repository: https://github.com/mozaddedalfeshani/localslack

বাংলা ডকুমেন্টেশন: [README.bn.md](README.bn.md)

## What It Does

- Public channels for everyone on the same local network.
- Three default channels: `#general`, `#media-share`, and `#announcements`.
- Group messaging with persisted local history on every device.
- File and asset sharing inside channels.
- Offline catch-up sync: when a member returns later, LocalSlack syncs the latest channel changes from online members.
- Asset availability badges showing how many members currently have a shared file.
- On-demand asset download from another online member.
- Author-only message edit and delete.
- Channel delete events remove saved asset files from devices during sync.
- Retention cleanup, defaulting to 5 months, for old messages and saved assets.
- Direct file send, receive prompts, clipboard text sharing, favorites, and transfer history.
- Cross-platform desktop builds for Windows, macOS, and Linux.

## How Sync Works

LocalSlack is peer-to-peer. Each device stores channel events locally using Sled. Devices discover each other through mDNS on the local network and periodically exchange channel events.

If a member leaves and comes back later, their app contacts online members, pulls the latest complete channel state it can find, merges updates by timestamp, and saves the result locally. Shared files are not uploaded to a cloud server; they stay on members' computers. If your device does not have a shared asset, the asset card shows a download action and fetches the file from an online member that has it.

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

Run Rust tests:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
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

## Local Network Details

- Discovery service type: `_localslack._tcp.local.`
- Default receive port: `53317`
- Default app data folder: `LocalSlack`
- Default received file folder: `~/Downloads/LocalSlack`
- Channel assets are saved under `<channel-id>/` inside the selected save path.

## Releases

GitHub Actions builds installers when a tag like `v0.1.0` is pushed, or when the release workflow is run manually.

Release assets:

- Linux: `.deb`
- macOS: `.dmg`
- Windows: `.exe`

The release workflow creates a draft release and attaches the installers with release notes.

## License

Open source. Add your preferred license file before publishing a stable release.
