# Chrome Web Store Dashboard Fields

Use `release/youtube-focus-mode-v3.0.1.zip` for the package upload.

The package is already uploaded in the Chrome Web Store Developer Dashboard for:

- Item: YouTube Focus Mode
- Item ID: `feineenlljealpgoohilfdfmocmceohk`
- Status: Draft

## Store Listing

Category: Productivity

Language: English

For the Slovenian dashboard UI:

- Opis: paste the detailed description below.
- Kategorija: Productivity / Produktivnost.
- Jezik: English.
- Globalni promocijski videoposnetek: leave empty unless you have a YouTube promo video.
- Uradni URL: Brez.
- URL domace strani: leave empty unless you have a product website.
- URL za podporo: leave empty unless you have a support/help page.
- Vsebina za odrasle: No / Ne.

Tagline:
Minimal YouTube focus for deliberate watching.

Short description:
Strip YouTube down to search and video only, with optional timed focus sessions.

Detailed description:
YouTube Focus Mode turns YouTube into a calmer, more intentional space. When Focus Mode is on, the extension removes the feed, related videos, comments, Shorts, Explore, Trending, and other visual noise so you can use search or watch exactly what you meant to open. Timed Lock keeps Focus Mode enabled for a timed session when you want a soft commitment. The experience is fast, minimal, and designed to feel effortless.

## Single Purpose

Help users watch YouTube intentionally by hiding distracting YouTube interface elements and optionally keeping Focus Mode enabled for a timed session.

## Permission Justifications

storage:
Used to save Focus Mode state, Timed Lock end time, and the user's light/dark theme preference locally in Chrome.

host permission: https://www.youtube.com/*
Required so the content script can run only on YouTube pages and hide distracting interface elements such as feeds, Shorts, comments, related videos, Explore, Trending, and notification panels.

## Privacy

Privacy policy URL:
Use the public GitHub URL for `PRIVACY.md` or the GitHub Pages URL for `privacy.html`.

GitHub file URL:
`https://github.com/flegartech-mvp/Youtube-Focus/blob/master/PRIVACY.md`

GitHub Pages URL after enabling Pages:
`https://flegartech-mvp.github.io/Youtube-Focus/privacy.html`

User data collection:
The extension does not collect, sell, transmit, or share user data. Settings are stored locally with `chrome.storage.local` and are not sent to any server.

Remote code:
The extension does not load or execute remote code.

Data usage note:
The optional support button opens a PayPal page only after the user clicks it. The extension itself does not track that click or collect payment information.

## Test Instructions

1. Install the uploaded package in Chrome.
2. Open `https://www.youtube.com/`.
3. Confirm Focus Mode hides the home feed and shows the minimal search screen.
4. Search for a video and open a watch page.
5. Confirm comments, related videos, Shorts shelves, and notification distractions are hidden.
6. Open the extension popup, turn Focus Mode off, and confirm YouTube returns to normal.
7. Start a 25-minute Timed Lock session and confirm Focus Mode stays enabled until the timer expires.

## Listing Images

Required:
- Extension icon: `icons/icon128.png`
- Small promotional image: `store-assets/upload/small-promo-440x280-24bit.png`
- Screenshot: `store-assets/upload/screenshot-focus-on-1280x800-24bit.png`

Recommended extras:
- `store-assets/upload/screenshot-focus-off-1280x800-24bit.png`
- `store-assets/upload/screenshot-lock-mode-1280x800-24bit.png`
- `store-assets/upload/marquee-promo-1400x560-24bit.png`

These `store-assets/upload` files are 24-bit PNGs without an alpha channel, which matches the Chrome Web Store image upload requirement for screenshots and promotional tiles.
