const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { expect, test } = require("@playwright/test");

const popupUrl = pathToFileURL(path.join(__dirname, "..", "popup.html")).href;
const screenshotDir = path.join(__dirname, "..", "output", "playwright");

function installChromeMock() {
  const store = {};
  const listeners = new Set();

  globalThis.chrome = {
    runtime: {
      lastError: null
    },
    storage: {
      local: {
        get(defaults, callback) {
          const result = { ...defaults };
          for (const key of Object.keys(defaults)) {
            if (Object.prototype.hasOwnProperty.call(store, key)) {
              result[key] = store[key];
            }
          }
          callback(result);
        },
        set(payload, callback) {
          const changes = {};
          for (const [key, value] of Object.entries(payload)) {
            changes[key] = {
              oldValue: store[key],
              newValue: value
            };
            store[key] = value;
          }
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installChromeMock);
});

test("popup supports focus, theme, and custom lock flows", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.setViewportSize({ width: 380, height: 560 });
  await page.goto(popupUrl);

  await expect(page.getByRole("heading", { name: "Focus Mode" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Toggle Focus Mode" })).toHaveAttribute("aria-checked", "false");

  await page.getByRole("switch", { name: "Toggle Focus Mode" }).click();
  await expect(page.getByRole("switch", { name: "Toggle Focus Mode" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Distractions hidden")).toBeVisible();

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("radio", { name: "Custom" }).click();
  await page.getByLabel("Minutes").fill("0");
  await expect(page.getByText("Enter a whole number from 1 to 480.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter a valid duration" })).toBeDisabled();

  await page.getByLabel("Minutes").fill("45");
  await expect(page.getByRole("button", { name: "Start 45m soft lock" })).toBeEnabled();
  await page.getByRole("button", { name: "Start 45m soft lock" }).click();
  await expect(page.getByText(/Soft lock:/)).toBeVisible();

  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, "popup-desktop.png"), fullPage: true });

  expect(browserErrors).toEqual([]);
});

test("popup remains usable at narrow mobile width", async ({ page }) => {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.setViewportSize({ width: 320, height: 620 });
  await page.goto(popupUrl);

  await expect(page.getByRole("heading", { name: "Focus Mode" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "25m" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start 25m soft lock" })).toBeVisible();

  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, "popup-mobile.png"), fullPage: true });

  expect(browserErrors).toEqual([]);
});
