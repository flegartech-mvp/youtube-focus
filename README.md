# YouTube Focus Mode

YouTube Focus Mode is a Chrome extension that makes YouTube calmer by hiding feeds, Shorts surfaces, comments, related videos, Explore, Trending, and notification distractions while Focus Mode is enabled.

The extension stores settings locally with `chrome.storage.local`. It does not collect analytics, load remote code, or send user data to a server.

## Features

- One-click Focus Mode toggle from the extension popup.
- Minimal blocked-page experience with search-first YouTube access.
- Timed Lock for 25, 50, 90, or custom-minute focus sessions.
- Light and dark popup themes.
- Local-only state and theme storage.

## Important Limits

Timed Lock is a soft commitment tool, not a security boundary. A user can still bypass it by disabling the extension, clearing extension storage, changing the system clock, using another browser/profile, or uninstalling the extension.

YouTube changes its internal markup frequently. This extension uses a mix of stable route checks, CSS rules, and DOM selectors, so every release should be smoke-tested against the current YouTube UI before publishing.

## Local Install

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Open `https://www.youtube.com/` and use the extension popup.

## Development

This project has no runtime dependencies.

```powershell
npm run validate
```

The validation command checks JavaScript syntax and runs the storage tests.

## Release Build

```powershell
npm run build
```

The build script creates `release/youtube-focus-mode-v<manifest-version>.zip` and prints a SHA256 checksum.

## Store Materials

Chrome Web Store copy and upload notes live in `store-assets/`.

Use:

- `store-assets/store-description.md` for public listing copy.
- `store-assets/chrome-web-store-dashboard-fields.md` for dashboard fields and permission justifications.
- `PRIVACY.md` or `privacy.html` for the privacy policy.

## Support

For production launch, publish a support URL or support email in the Chrome Web Store listing. The current package is privacy-friendly, but users still need somewhere to report selector breakage when YouTube changes.

## License

No license file is currently included. Add one before publishing the source publicly so users and contributors know what rights are granted.

---

Made by FlegarTech. If this project helped you, you can [support development](https://paypal.me/TiniFlegar).
