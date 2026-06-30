# Testing

Run automated checks before packaging:

```powershell
npm run validate
```

Run popup and content-script browser checks with Playwright:

```bash
npx playwright install chromium
npm run test:ui
```

The Playwright checks open `popup.html`, `privacy.html`, and YouTube-shaped fixtures with mocked Chrome extension APIs, drive the main popup/content-script controls, check for browser console/page errors, and write screenshots to `output/playwright/`.

Run a release build:

```powershell
npm run build
```

## Manual Smoke Test

Use a fresh Chrome profile or clear extension storage before testing install defaults.

1. Load the unpacked extension from this project folder.
2. Open `https://www.youtube.com/`.
3. Confirm YouTube is restored by default and Focus Mode can be enabled from the popup.
4. With Focus Mode enabled, confirm the home feed is replaced by the minimal search screen.
5. Click the YouTube mark on the minimal screen and confirm it focuses the search field instead of navigating to a blocked home page.
6. Search for a video and open a watch page.
7. Confirm comments, related videos, Shorts shelves, merch shelves, Explore, Trending, and notification distractions are hidden.
8. Turn Focus Mode off and confirm YouTube returns to normal.
9. Start a 1-minute custom Timed Lock and confirm Focus Mode stays enabled until the timer expires.
10. Try custom values below 1 and above 480 and confirm the popup normalizes them to the supported range.
11. Test light and dark popup themes.
12. Reload YouTube while Focus Mode is enabled and confirm the page settles into the expected focused state.

## Known Manual Risk Areas

- YouTube DOM selector changes can break hidden surfaces without causing JavaScript errors.
- New YouTube surfaces may appear under names the extension does not know yet.
- Timed Lock is local and bypassable; verify the UI describes it as a soft commitment.
