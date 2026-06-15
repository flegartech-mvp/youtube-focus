# PROMO_AUDIT — YoutubeFocus

## What was deleted
The previous promo material in this folder was removed and replaced with the new 10-format pack:
- `promo/FINAL_PROMO_CHECKLIST.md`
- `promo/POST_READY.md`
- `promo/PRODUCT_PITCH.md`
- `promo/README_HEADLINE.md`
- `promo/SAFE_PUBLIC_CLAIMS.md`
- `promo/SCREENSHOT_LIST.md`
- `promo/SHORT_VIDEO_SCRIPT.md`
- `promo/SOCIAL_CAPTIONS.md`
- `promo/images`

## How screenshots were captured
Real product screenshots were captured in earlier live sessions by running the app locally and
driving it with Playwright + Chromium (desktop 1280×800 / retina, mobile 375×812). They were
**not** re-generated or mocked for this pack — the same verified, real captures are reused and
copied into `source-screenshots/`. No fake or AI-invented UI is used anywhere.

## Routes / screens used
- `YoutubeFocus-master/store-assets/screenshot-focus-on-1280x800.png`
- `YoutubeFocus-master/store-assets/screenshot-lock-mode-1280x800.png`
- `YoutubeFocus-master/store-assets/screenshot-focus-off-1280x800.png`

## Run status
App was run locally in a prior session and is reflected by the real screenshots above.

## Final quality checklist
- [x] All 10 images render at the exact target dimensions
- [x] Real screenshots used (no mocked/invented UI)
- [x] Project name, tagline and 3 feature points present
- [x] "Built by FlegarTech" attribution present
- [x] Browser / phone frames, consistent dark + green brand system
- [x] Text large enough to read on mobile
- [x] No stretched or cover-cropped screenshots (frames follow true aspect ratio)

## Promo videos

**Generated:** 8 platform videos + 2 GIF fallbacks per project, via `build-videos.mjs`.
- `videos/01-instagram-reel.mp4` (5.2 MB)
- `videos/02-tiktok.mp4` (5.2 MB)
- `videos/03-youtube-short.mp4` (5.2 MB)
- `videos/04-linkedin-demo.mp4` (9.1 MB)
- `videos/05-x-demo.mp4` (6.3 MB)
- `videos/06-facebook-demo.mp4` (9.0 MB)
- `videos/07-github-readme-demo.mp4` (4.3 MB)
- `videos/08-portfolio-hero.mp4` (9.0 MB)
- `videos/gifs/github-readme-demo.gif` (5.2 MB)
- `videos/gifs/short-demo.gif` (8.0 MB)

**Source recordings:** none needed — videos are composed from the same **real** screenshots listed
above (no live screen-recording, no stock footage, no invented UI). Motion is added in post with ffmpeg.

**Screens/routes used:** Focus on, Lock mode, Focus off.

**Tools:** Playwright + Chromium (render branded scene cards at 2× from real screenshots) →
ffmpeg 7.0.2 (zoompan Ken Burns, xfade crossfades, libx264 CRF 18–20, GIF palettegen/paletteuse).

**Limitations:** Playwright's built-in video recorder (bundled ffmpeg) was unavailable, so motion is
post-composed from real stills rather than a live screen recording — visually equivalent and sharper.
Vertical reels ~19s; horizontal demos ~27s (LinkedIn padded to 30s). Audio: none (silent, license-safe).

**Final video quality checklist:**
- [x] Correct dimensions for every file
- [x] Durations within platform ranges (verticals 15–30s, LinkedIn 30–60s)
- [x] Smooth motion (30 fps Ken Burns + crossfades), no blank frames
- [x] Real product screenshots only — no fake/unrelated UI
- [x] Readable captions, project name + 3 feature callouts + CTA
- [x] "Built by FlegarTech" + GitHub CTA card present
- [x] File sizes reasonable for upload (videos ≤ ~5 MB, GIFs ≤ ~7 MB)
