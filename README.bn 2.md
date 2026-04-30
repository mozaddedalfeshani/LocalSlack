# SwiftShare

SwiftShare একটি ওপেন-সোর্স ডেস্কটপ অ্যাপ, যা লোকাল Wi-Fi বা LAN নেটওয়ার্কে দ্রুত ফাইল শেয়ার করার জন্য তৈরি। এটি LocalSend থেকে অনুপ্রাণিত এবং React, TypeScript, Rust ও Tauri v2 দিয়ে তৈরি।

রিপোজিটরি: https://github.com/mozaddedalfeshani/swiftshare

English documentation: [README.md](README.md)

## ফিচার

- লোকাল নেটওয়ার্কে ফাইল, ফোল্ডার, ছবি, মিডিয়া এবং টেক্সট পাঠানো।
- ইন্টারনেট বা কোনো কেন্দ্রীয় সার্ভার ছাড়াই ফাইল গ্রহণ।
- একই Wi-Fi/LAN-এ থাকা ডিভাইস খুঁজে পাওয়া।
- ক্লিপবোর্ড টেক্সট পাঠানো ও গ্রহণ।
- পছন্দের ডিভাইস পিন করার জন্য Favorites।
- পাঠানো ও পাওয়া ফাইলের History।
- Dark, Light এবং System থিম।
- English ও বাংলা ভাষা সাপোর্ট।
- Windows, macOS এবং Linux-এর জন্য ডেস্কটপ বিল্ড।

## টেক স্ট্যাক

- Frontend: React 18, TypeScript, Tailwind CSS, Framer Motion
- State: Zustand
- Desktop: Tauri v2
- Backend: Rust, Tokio, Axum, Reqwest
- Discovery এবং storage: mDNS, Sled
- Tests: Vitest, React Testing Library, Rust tests

## ডেভেলপমেন্ট

ডিপেন্ডেন্সি ইনস্টল করুন:

```bash
bun install
```

ডেস্কটপ অ্যাপ চালান:

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

## Releases

`v0.1.0`-এর মতো tag push করলে, অথবা GitHub Actions থেকে workflow manually চালালে installer build হবে।

Release assets:

- Linux: `.deb`
- macOS: `.dmg`
- Windows: `.exe`

Release workflow একটি draft release তৈরি করে এবং installer গুলো release notes সহ attach করে।

## License

এটি ওপেন-সোর্স। Stable release publish করার আগে আপনার পছন্দের license file যোগ করুন।
