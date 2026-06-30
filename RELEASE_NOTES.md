# Release Notes — YouTube Focus Mode

## v3.0.2 (current)
- Added cross-platform lint, visual, and browser smoke verification to the release flow.
- Tightened Focus Mode route handling so non-search/non-watch YouTube routes show the focused search screen while Focus Mode is enabled.
- Hardened popup/content-script storage error paths to avoid unhandled promise rejections.
- Updated CI to install dependencies, install the Playwright browser, run validation, run browser smoke tests, and then build the release ZIP.

## v3.0.1
- Packaging hardened for Chrome Web Store: release ZIP now built with a
  zero-dependency, cross-platform Node packer (`npm run build`) that writes
  forward-slash entry names. The previous PowerShell `Compress-Archive` ZIP
  used backslash separators (`icons\icon128.png`), which can break icon/path
  resolution on the store.
- Validation (`npm run validate`) and storage unit tests pass on Node 24.
- Manifest V3, `storage` permission only, `https://www.youtube.com/*` host only.

## v3.0.0
- Focus Mode toggle, Timed Lock sessions (25/50/90/custom min), light/dark popup.
- Removes feed, comments, related, Shorts, Explore, Trending, notifications.

## Packaging
```bash
npm run validate   # node --check + storage tests
npm run build      # → release/youtube-focus-mode-v<version>.zip (cross-platform)
```
Bump `version` in `manifest.json` and `package.json` before each store submission.
