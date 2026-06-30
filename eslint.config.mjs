import js from "@eslint/js";

const browserGlobals = {
  chrome: "readonly",
  console: "readonly",
  document: "readonly",
  Event: "readonly",
  FocusModeStorage: "readonly",
  getComputedStyle: "readonly",
  globalThis: "readonly",
  history: "readonly",
  innerHeight: "readonly",
  innerWidth: "readonly",
  location: "readonly",
  localStorage: "readonly",
  MutationObserver: "readonly",
  Node: "readonly",
  self: "readonly",
  window: "readonly"
};

const nodeGlobals = {
  Buffer: "readonly",
  __dirname: "readonly",
  console: "readonly",
  process: "readonly",
  require: "readonly"
};

export default [
  {
    ignores: [
      "node_modules/**",
      "release/**",
      "output/**",
      "playwright-report/**",
      "test-results/**",
      "store-assets/**/*.png",
      "icons/**/*.png"
    ]
  },
  js.configs.recommended,
  {
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      globals: browserGlobals
    }
  },
  {
    files: ["tests/**/*.js", "scripts/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...browserGlobals,
        ...nodeGlobals
      }
    }
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      sourceType: "commonjs"
    }
  }
];
