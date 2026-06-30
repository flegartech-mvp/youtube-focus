# Chrome Web Store Listing — YouTube Focus Mode

Canonical listing copy and dashboard field mapping live in:
- `store-assets/store-description.md` — tagline, short & long description, feature bullets
- `store-assets/chrome-web-store-dashboard-fields.md` — exact dashboard field values
- `store-assets/*.png` — screenshots (1280×800), feature tiles (640×400), small promo (440×280), hero (1280×800)

## Summary for submission
| Field | Value |
|-------|-------|
| Name | YouTube Focus Mode |
| Version | 3.0.2 (from `manifest.json`) |
| Category | Productivity |
| Single purpose | Strip YouTube to search + video with optional timed focus sessions |
| Permissions | `storage`, host `https://www.youtube.com/*` — see [PERMISSIONS_JUSTIFICATION.md](PERMISSIONS_JUSTIFICATION.md) |
| Privacy policy | [PRIVACY.md](PRIVACY.md) / `privacy.html` (no data collection) |
| Data use | None collected/transmitted; only local preference flags |
| Package | `release/youtube-focus-mode-v3.0.2.zip` (`npm run build`) |

## Pre-submission checklist
- [x] MV3 manifest, minimal permissions
- [x] Icons 16/48/128 present and referenced
- [x] `npm run validate` passes (syntax + storage tests)
- [x] Release ZIP built with forward-slash entries, integrity-verified
- [x] Privacy policy + permission justification written
- [ ] Load unpacked in `chrome://extensions` and run [TESTING.md](TESTING.md) flows
- [ ] Submit (requires developer account — manual approval step)
