/**
 * Overlay geometry regression test (cross-platform, runs on Linux/macOS/Windows).
 *
 * Replaces the Windows-only PowerShell UI script. Detects the class of defect
 * reported in the field: the focus overlay collapsing into a tall, narrow,
 * scrollable white/gray strip over the page (instead of covering the viewport).
 *
 * It uses system Google Chrome via Playwright's `channel: 'chrome'` (no Chromium
 * download). It runs fully offline against a local fixture that mimics YouTube's
 * blocked/allowed routes and injects the REAL content.js at document_start.
 *
 * Asserts:
 *   1. Blocked route + focus on  -> overlay covers the full viewport (== innerWidth/Height).
 *   2. Allowed route             -> overlay is display:none with zero footprint.
 *   3. No extension element is a tall-narrow strip.
 *   4. Robustness: even inside a transformed/`contain` ancestor (which makes a
 *      position:fixed element resolve against that box), the overlay CSS still
 *      pins to the viewport and does NOT collapse. This is the direct guard
 *      against the reported strip.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const storageSrc = readFileSync(join(ROOT, 'storage.js'), 'utf8');
const contentSrc = readFileSync(join(ROOT, 'content.js'), 'utf8');

const shim = `(function(){var store={focusModeState:{focusEnabled:true,lockEnabled:false,lockEndTime:null},focusModeTheme:'light'};
self.chrome=self.chrome||{};self.chrome.runtime={};
self.chrome.storage={local:{get:function(d,cb){var r={};for(var k in d)r[k]=(k in store)?store[k]:d[k];cb(r);},set:function(p,cb){for(var k in p)store[k]=p[k];if(cb)cb();}},onChanged:{addListener:function(){},removeListener:function(){}}};})();`;
const docStart = `<script>${shim}\n${storageSrc}\n${contentSrc}</script>`;

// Minimal YouTube-like fixture, served from a fake same-origin host so that
// content.js reads the correct location.pathname (route logic depends on it).
const FIXTURE = `<!doctype html><html><head>${docStart}<style>body{margin:0}</style></head>
  <body><ytd-app><div id="masthead"><div id="start"></div><div id="center"></div><div id="end"></div></div>
  <ytd-page-manager><ytd-rich-grid-renderer style="height:2000px">grid</ytd-rich-grid-renderer></ytd-page-manager></ytd-app>
  </body></html>`;
const ORIGIN = 'http://yt.test';

const VIEWPORT = { width: 1366, height: 768 };
const failures = [];
function check(name, cond, detail) {
  if (cond) { console.log(`  PASS  ${name}`); }
  else { console.log(`  FAIL  ${name} -> ${detail}`); failures.push(name); }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: VIEWPORT });
await context.route(`${ORIGIN}/**`, (route) =>
  route.fulfill({ status: 200, contentType: 'text/html', body: FIXTURE })
);
const page = await context.newPage();

async function geom() {
  return page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const ph = document.getElementById('yt-focus-mode-placeholder');
    let placeholder = null;
    if (ph) {
      const r = ph.getBoundingClientRect(); const cs = getComputedStyle(ph);
      placeholder = { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, parent: ph.parentElement?.tagName.toLowerCase() };
    }
    const strips = [];
    for (const el of document.querySelectorAll('#yt-focus-mode-placeholder, #yt-focus-mode-placeholder *')) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
      if (r.height > vh * 0.5 && r.width > 0 && r.width < 130) strips.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
    }
    const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    return { vw, vh, placeholder, strips, overflowX };
  });
}

try {
  console.log('# 1. Blocked route (home) + focus on');
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(400);
  let g = await geom();
  check('overlay visible (grid)', g.placeholder && g.placeholder.display === 'grid', JSON.stringify(g.placeholder));
  check('overlay width == viewport', g.placeholder && Math.abs(g.placeholder.w - g.vw) <= 2, `${g.placeholder?.w} vs ${g.vw}`);
  check('overlay height == viewport', g.placeholder && Math.abs(g.placeholder.h - g.vh) <= 2, `${g.placeholder?.h} vs ${g.vh}`);
  check('overlay mounted on <html>', g.placeholder && g.placeholder.parent === 'html', `parent=${g.placeholder?.parent}`);
  check('no tall-narrow strip', g.strips.length === 0, JSON.stringify(g.strips));
  check('no horizontal overflow', !g.overflowX, 'document overflows horizontally');

  console.log('# 2. Allowed route (watch) -> overlay hidden, zero footprint');
  await page.goto(`${ORIGIN}/watch`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(400);
  g = await geom();
  check('overlay hidden (none)', g.placeholder && g.placeholder.display === 'none', JSON.stringify(g.placeholder));
  check('overlay zero footprint', g.placeholder && g.placeholder.w === 0 && g.placeholder.h === 0, JSON.stringify(g.placeholder));

  console.log('# 3. Robustness: hostile transformed/contained ancestor must NOT collapse overlay');
  // Move the placeholder inside a narrow transformed container, then assert it still fills the viewport.
  await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(400);
  await page.evaluate(() => {
    const ph = document.getElementById('yt-focus-mode-placeholder');
    const trap = document.createElement('div');
    trap.style.cssText = 'width:80px;transform:translateZ(0);contain:layout paint';
    document.body.appendChild(trap);
    trap.appendChild(ph); // worst case: fixed overlay now resolves against an 80px box
  });
  await page.waitForTimeout(200);
  g = await geom();
  check('overlay still == viewport under hostile ancestor', g.placeholder && Math.abs(g.placeholder.w - g.vw) <= 2 && Math.abs(g.placeholder.h - g.vh) <= 2, JSON.stringify(g.placeholder));
  check('no tall-narrow strip under hostile ancestor', g.strips.length === 0, JSON.stringify(g.strips));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\nOVERLAY GEOMETRY TEST FAILED (${failures.length}): ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\noverlay geometry tests passed');
