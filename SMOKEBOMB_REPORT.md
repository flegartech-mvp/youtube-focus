# Smokebomb Report

Date: May 27, 2026

## Project Type

- Chrome extension, Manifest V3.
- Static popup UI plus YouTube content script.
- Package manager: npm.
- Supabase: not used.
- Auth, CRUD, import/export, backup, server routes, dev server, and preview server: not applicable.

## Commands Run

- `npm install`
- `npm run check`
- `npm test`
- `npm run validate`
- `npx --yes -p @playwright/test playwright install chromium`
- `npm run test:ui`
- `npm run build`

Note: one final parallel verification attempt failed before project code ran because Windows PowerShell/CLR failed to start multiple processes at once. The same verification commands were rerun sequentially and passed.

## Pages And Surfaces Tested

- `popup.html`
- `privacy.html`
- YouTube home route fixture: `https://www.youtube.com/`
- YouTube results route fixture: `https://www.youtube.com/results?search_query=...`
- YouTube watch route fixture: `https://www.youtube.com/watch?v=...`

## Flows Tested

- Popup loads with default Focus Mode off.
- Focus Mode toggle enables and persists after refresh.
- Theme toggle saves dark/light mode.
- Custom Timed Lock accepts valid whole minutes.
- Custom Timed Lock rejects invalid values, including decimals and out-of-range values.
- Support button opens the PayPal destination via mocked `chrome.tabs.create`.
- Privacy page loads without console/page errors.
- Focus-enabled YouTube home route replaces feed with focused search UI.
- Empty focused search submission stays on the blocked home route.
- Filled focused search navigates to YouTube results.
- Watch route hides comments, related videos, Shorts, Explore/feed links, and restores them after storage update.
- Console/page errors are collected and fail the Playwright smoke tests.
- Refresh-state behavior covered for popup Focus Mode.

## Viewports Tested

- Desktop: 1440x900
- Laptop: 1280x720
- Tablet: 768x1024
- Mobile: 390x844
- Existing narrow popup regression: 320x620

## Screenshots Taken

- `output/playwright/popup-desktop.png`
- `output/playwright/popup-mobile.png`
- `output/playwright/smokebomb-popup-desktop.png`
- `output/playwright/smokebomb-popup-laptop.png`
- `output/playwright/smokebomb-popup-tablet.png`
- `output/playwright/smokebomb-popup-mobile.png`
- `output/playwright/smokebomb-privacy-desktop.png`
- `output/playwright/smokebomb-youtube-home-blocked.png`
- `output/playwright/smokebomb-youtube-results-restored.png`
- `output/playwright/smokebomb-youtube-watch-restored.png`

## Bugs Found

- Custom Timed Lock validation used `parseInt`, so decimal input such as `1.5` was treated as `1` despite the UI requiring a whole number.
- The Playwright UI runner only ran the popup spec by default, leaving content-script smoke coverage out of the default UI test command.

## Bugs Fixed

- `popup.js`: changed custom duration parsing to require integer values and added a shared duration clamp helper.
- `tests/smokebomb.spec.js`: added decimal-duration coverage and broader smoke tests.
- `scripts/run-playwright-ui.ps1`: changed the default Playwright spec list so `npm run test:ui` runs both popup and smokebomb specs.

## UI Issues Fixed

- No app UI redesign was needed.
- Playwright screenshots now wait for the focused YouTube placeholder animation to settle before capture.

## Tests Added

- Added `tests/smokebomb.spec.js`.
- Coverage includes popup load/state/validation/donation behavior, privacy page load, content-script blocked home route, focused search behavior, watch-route hiding/restoration, console error detection, and requested viewports.

## Files Changed

- `popup.js`
- `scripts/run-playwright-ui.ps1`
- `tests/smokebomb.spec.js`
- `SMOKEBOMB_REPORT.md`
- Playwright screenshot artifacts under `output/playwright/`
- Release archive rebuilt at `release/youtube-focus-mode-v3.0.1.zip`

## Final Verification Result

- `npm run validate`: PASS
- `npm run test:ui`: PASS, 6 tests passed
- `npm run build`: PASS
- Release SHA256: `AD61D2C090BFBFC3667B297FAEA902CB825547D6F8F3CF4F0901EFF741F1C262`

## Remaining Issues

- Live YouTube DOM selector drift remains the main manual risk. The automated smoke uses YouTube-shaped fixtures so it can catch route/state regressions, but a real Chrome install should still be checked against current YouTube before publishing.
- No lint or typecheck script exists in `package.json`.
- No custom app-level 404 route exists because this is a static Chrome extension, not a routed web app.
