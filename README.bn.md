# LocalSlack

LocalSlack হলো same Wi-Fi বা LAN-এর জন্য local-first desktop collaboration app। এটি Slack-এর মতো public channel, message, asset sharing এবং offline catch-up sync দেয়, কিন্তু internet বা central cloud server লাগে না।

রিপোজিটরি: https://github.com/mozaddedalfeshani/localslack

English documentation: [README.md](README.md)

## কী করে

- একই local network-এর সবাই public channel member হয়।
- Default ৩টি channel: `#general`, `#media-share`, `#announcements`।
- Group messaging, এবং history প্রত্যেক device-এ localভাবে save হয়।
- Channel-এর ভিতরে file/asset share করা যায়।
- Offline catch-up sync: কোনো member পরে ফিরে এলে online members থেকে latest channel changes নিয়ে নেয়।
- Shared file card-এ কতজন member-এর কাছে asset আছে তার badge দেখা যায়।
- নিজের device-এ file না থাকলে online member-এর PC থেকে download করা যায়।
- শুধু author নিজের message edit/delete করতে পারে।
- Channel delete event sync হলে saved asset file device থেকে remove হয়।
- Default ৫ মাস retention cleanup; পুরনো message এবং saved asset auto-remove করা যায়।
- Direct file send, receive prompt, clipboard text sharing, favorites এবং transfer history আছে।
- Windows, macOS ও Linux-এর জন্য desktop build।

## Sync কীভাবে কাজ করে

LocalSlack peer-to-peer। প্রত্যেক device Sled database-এ channel event localভাবে save করে। mDNS দিয়ে same network-এর devices খুঁজে পায় এবং নিয়মিত channel events exchange করে।

কোনো member app বন্ধ করে ১ ঘণ্টা পরে ফিরে এলে, তার app online members-এর সঙ্গে contact করে latest complete channel state sync করে local database-এ save করবে। Shared file cloud-এ upload হয় না; member-দের computer-এই থাকে। আপনার device-এ কোনো asset না থাকলে card-এ Download button দেখাবে এবং যেই online member-এর কাছে file আছে তার কাছ থেকে download করবে।

## Tech Stack

- Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion
- State: Zustand
- Desktop: Tauri v2
- Backend: Rust, Tokio, Axum, Reqwest
- Discovery এবং storage: mDNS, Sled
- Tests: Vitest, React Testing Library, Rust tests

## Development

ডিপেন্ডেন্সি ইনস্টল করুন:

```bash
bun install
```

Desktop app চালান:

```bash
bun run tauri:dev
```

Frontend test চালান:

```bash
bun run test
```

Frontend build করুন:

```bash
bun run build
```

Rust test চালান:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Desktop bundle build করুন:

```bash
bun run tauri:build
```

## Linux Requirements

Ubuntu/Debian-এ Tauri build করার আগে এগুলো ইনস্টল করুন:

```bash
sudo apt-get update
sudo apt-get install -y libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev pkg-config
```

## Local Network Details

- Discovery service type: `_localslack._tcp.local.`
- Default receive port: `53317`
- Default app data folder: `LocalSlack`
- Default received file folder: `~/Downloads/LocalSlack`
- Channel asset selected save path-এর ভিতরে `<channel-id>/` folder-এ save হয়।

## Releases

`v0.1.0`-এর মতো tag push করলে, অথবা GitHub Actions থেকে workflow manually চালালে installer build হবে।

Release assets:

- Linux: `.deb`
- macOS: `.dmg`
- Windows: `.exe`

Release workflow একটি draft release তৈরি করে এবং installer গুলো release notes সহ attach করে।

## License

এটি open source। Stable release publish করার আগে আপনার পছন্দের license file যোগ করুন।
