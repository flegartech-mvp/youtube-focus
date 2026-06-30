const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { expect, test } = require("@playwright/test");

const rootDir = path.join(__dirname, "..");
const popupUrl = pathToFileURL(path.join(rootDir, "popup.html")).href;
const privacyUrl = pathToFileURL(path.join(rootDir, "privacy.html")).href;
const screenshotDir = path.join(rootDir, "output", "playwright");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 }
];

function installPersistentChromeMock(initialStore = {}) {
  const STORE_KEY = "__ytFocusChromeStore";
  const listeners = new Set();

  function readStore() {
    try {
      return JSON.parse(globalThis.localStorage.getItem(STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeStore(store) {
    globalThis.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  if (!globalThis.localStorage.getItem(STORE_KEY)) {
    writeStore(initialStore);
  }

  globalThis.chrome = {
    runtime: {
      lastError: null
    },
    storage: {
      local: {
        get(defaults, callback) {
          const store = readStore();
          const result = { ...defaults };
          for (const key of Object.keys(defaults)) {
            if (Object.prototype.hasOwnProperty.call(store, key)) {
              result[key] = store[key];
            }
          }
          callback(result);
        },
        set(payload, callback) {
          const store = readStore();
          const changes = {};
          for (const [key, value] of Object.entries(payload)) {
            changes[key] = {
              oldValue: store[key],
              newValue: value
            };
            store[key] = value;
          }
          writeStore(store);
          for (const listener of listeners) {
            listener(changes, "local");
          }
          callback?.();
        }
      },
      onChanged: {
        addListener(listener) {
          listeners.add(listener);
        },
        removeListener(listener) {
          listeners.delete(listener);
        }
      }
    },
    tabs: {
      create({ url }) {
        globalThis.__lastOpenedTab = url;
      }
    }
  };
}

function installConsoleCapture(page) {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  return browserErrors;
}

async function preparePopup(page, viewport, initialStore = {}) {
  await page.setViewportSize(viewport);
  await page.addInitScript(installPersistentChromeMock, initialStore);
  await page.goto(popupUrl);
}

function youtubeFixture(bodyContent) {
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>YouTube Fixture</title>
        <style>
          body { margin: 0; font-family: Arial, sans-serif; }
          ytd-masthead, #masthead-container, ytd-page-manager, #comments, #secondary { display: block; padding: 12px; }
        </style>
      </head>
      <body>${bodyContent}</body>
    </html>`;
}

async function openYoutubeFixture(page, url, bodyContent, store = {}) {
  await page.route("https://www.youtube.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: youtubeFixture(bodyContent)
    });
  });
  await page.goto(url);
  await page.evaluate((initialStore) => {
    localStorage.setItem("__ytFocusChromeStore", JSON.stringify(initialStore));
  }, store);
  await page.addScriptTag({ path: path.join(rootDir, "storage.js") });
  await page.addScriptTag({ path: path.join(rootDir, "content.js") });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installPersistentChromeMock);
});

test("smoke: popup loads, persists state, validates forms, and captures requested viewports", async ({ page }) => {
  const browserErrors = installConsoleCapture(page);

  for (const viewport of VIEWPORTS) {
    await preparePopup(page, viewport);

    await expect(page.getByRole("heading", { name: "Focus Mode" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Toggle Focus Mode" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "25m" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Support the creator" })).toBeVisible();

    await page.getByRole("radio", { name: "Custom" }).click();
    await page.getByLabel("Minutes").fill("1.5");
    await expect(page.getByText("Enter a whole number from 1 to 480.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter a valid duration" })).toBeDisabled();

    await page.getByLabel("Minutes").fill("481");
    await expect(page.getByText("Enter a whole number from 1 to 480.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter a valid duration" })).toBeDisabled();

    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, `smokebomb-popup-${viewport.name}.png`),
      fullPage: true
    });
  }

  await preparePopup(page, VIEWPORTS[0]);
  await page.getByRole("switch", { name: "Toggle Focus Mode" }).click();
  await expect(page.getByRole("switch", { name: "Toggle Focus Mode" })).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Toggle Focus Mode" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Support the creator" }).click();
  await expect.poll(async () => page.evaluate(() => globalThis.__lastOpenedTab)).toBe("https://paypal.me/TiniFlegar");

  expect(browserErrors).toEqual([]);
});

test("smoke: secondary privacy page loads cleanly", async ({ page }) => {
  const browserErrors = installConsoleCapture(page);

  await page.setViewportSize(VIEWPORTS[0]);
  await page.goto(privacyUrl);

  await expect(page.getByRole("heading", { name: "YouTube Focus Mode Privacy Policy" })).toBeVisible();
  await expect(page.getByText("does not collect, sell, transmit, or share personal data")).toBeVisible();

  await page.screenshot({
    path: path.join(screenshotDir, "smokebomb-privacy-desktop.png"),
    fullPage: true
  });

  expect(browserErrors).toEqual([]);
});

test("smoke: blocked YouTube home route shows focused search experience", async ({ page }) => {
  const browserErrors = installConsoleCapture(page);

  await page.setViewportSize(VIEWPORTS[0]);
  await openYoutubeFixture(
    page,
    "https://www.youtube.com/",
    `
      <ytd-masthead>masthead</ytd-masthead>
      <div id="masthead-container">masthead container</div>
      <ytd-page-manager>home feed</ytd-page-manager>
      <ytd-rich-item-renderer><a href="/shorts/abc">Shorts video</a></ytd-rich-item-renderer>
    `,
    {
      focusModeState: { focusEnabled: true, lockEnabled: false, lockEndTime: null },
      focusModeTheme: "light"
    }
  );

  await expect(page.locator("#yt-focus-mode-placeholder")).toBeVisible();
  await expect(page.locator("ytd-page-manager")).toBeHidden();

  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screenshotDir, "smokebomb-youtube-home-blocked.png"),
    fullPage: true
  });

  await page.getByRole("button", { name: "Focus search" }).click();
  await expect(page.getByRole("searchbox", { name: "Search YouTube" })).toBeFocused();

  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL("https://www.youtube.com/");

  await page.getByRole("searchbox", { name: "Search YouTube" }).fill("lofi focus");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/results\?search_query=lofi\+focus/);

  await page.screenshot({
    path: path.join(screenshotDir, "smokebomb-youtube-results-restored.png"),
    fullPage: true
  });

  expect(browserErrors).toEqual([]);
});

test("smoke: non-search YouTube routes are blocked while Focus Mode is enabled", async ({ page }) => {
  const browserErrors = installConsoleCapture(page);

  await page.setViewportSize(VIEWPORTS[2]);
  await openYoutubeFixture(
    page,
    "https://www.youtube.com/@example",
    `
      <ytd-masthead>masthead</ytd-masthead>
      <ytd-page-manager>channel page</ytd-page-manager>
    `,
    {
      focusModeState: { focusEnabled: true, lockEnabled: false, lockEndTime: null },
      focusModeTheme: "light"
    }
  );

  await expect(page.locator("#yt-focus-mode-placeholder")).toBeVisible();
  await expect(page.locator("ytd-page-manager")).toBeHidden();

  await page.getByRole("searchbox", { name: "Search YouTube" }).fill("deep work music");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/results\?search_query=deep\+work\+music/);

  expect(browserErrors).toEqual([]);
});

test("smoke: YouTube watch route hides distractions and restores after storage update", async ({ page }) => {
  const browserErrors = installConsoleCapture(page);

  await page.setViewportSize(VIEWPORTS[1]);
  await openYoutubeFixture(
    page,
    "https://www.youtube.com/watch?v=abc123",
    `
      <ytd-masthead>
        <div id="start">start</div>
        <div id="center">search</div>
        <div id="end">end</div>
      </ytd-masthead>
      <ytd-watch-flexy is-two-columns_>
        <div id="columns">
          <main id="primary">video player</main>
          <aside id="secondary">related videos</aside>
        </div>
      </ytd-watch-flexy>
      <section id="comments">comments</section>
      <ytd-rich-item-renderer id="shorts-card"><a href="/shorts/abc">Shorts video</a></ytd-rich-item-renderer>
      <ytd-guide-entry-renderer id="explore-link"><a href="/feed/explore">Explore</a></ytd-guide-entry-renderer>
    `,
    {
      focusModeState: { focusEnabled: true, lockEnabled: false, lockEndTime: null },
      focusModeTheme: "dark"
    }
  );

  await expect(page.locator("html")).toHaveClass(/yt-focus-enabled/);
  await expect(page.locator("html")).toHaveClass(/yt-focus-watch/);
  await expect(page.locator("#secondary")).toBeHidden();
  await expect(page.locator("#comments")).toBeHidden();
  await expect(page.locator("#shorts-card")).toBeHidden();
  await expect(page.locator("#explore-link")).toBeHidden();

  await page.evaluate(() => {
    chrome.storage.local.set({
      focusModeState: { focusEnabled: false, lockEnabled: false, lockEndTime: null }
    });
  });

  await expect(page.locator("html")).not.toHaveClass(/yt-focus-enabled/);
  await expect(page.locator("#comments")).toBeVisible();
  await expect(page.locator("#secondary")).toBeVisible();
  await expect(page.locator("#shorts-card")).toBeVisible();
  await expect(page.locator("#explore-link")).toBeVisible();

  await page.screenshot({
    path: path.join(screenshotDir, "smokebomb-youtube-watch-restored.png"),
    fullPage: true
  });

  expect(browserErrors).toEqual([]);
});
