(() => {
  const STYLE_ID = "yt-focus-mode-style";
  const PLACEHOLDER_ID = "yt-focus-mode-placeholder";
  const MANAGED_ATTR = "data-yt-focus-managed";
  const MANAGED_PREV_HIDDEN_ATTR = "data-yt-focus-prev-hidden";
  const DEBOUNCE_MS = 60;
  const ROUTE_EVENTS = [
    "yt-navigate-start",
    "yt-navigate-finish",
    "yt-page-data-updated",
    "spfdone",
    "popstate"
  ];
  const ALLOWED_ROUTES = new Set([
    "/results",
    "/watch"
  ]);
  const SHORTS_LINK_SELECTOR = 'a[href^="/shorts"], a[href*="/shorts/"]';
  const GUIDE_LINK_SELECTOR = 'a[href^="/feed/"], a[href^="/shorts"]';
  const NOTIFICATION_PANEL_SELECTOR = "tp-yt-iron-dropdown, ytd-multi-page-menu-renderer";
  const SHORTS_CONTAINER_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-compact-radio-renderer",
    "ytd-compact-playlist-renderer",
    "ytd-rich-section-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer"
  ].join(", ");
  const GUIDE_CONTAINER_SELECTOR = [
    "ytd-guide-entry-renderer",
    "ytd-mini-guide-entry-renderer"
  ].join(", ");

  let state = FocusModeStorage.DEFAULT_STATE;
  let theme = FocusModeStorage.DEFAULT_THEME;
  let lastPath = location.pathname;
  let applyTimer = 0;

  initialize();

  async function initialize() {
    injectStyles();
    bindNavigation();
    bindStorage();
    observeDom();

    try {
      const [nextState, nextTheme] = await Promise.all([
        FocusModeStorage.getState(),
        FocusModeStorage.getTheme()
      ]);

      state = nextState;
      theme = nextTheme;
    } catch (error) {
      console.error("Focus Mode could not load saved settings.", error);
      state = FocusModeStorage.normalizeState(state);
      theme = FocusModeStorage.normalizeTheme(theme);
    }

    queueApply();
  }

  function bindNavigation() {
    const schedule = () => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
      }

      queueApply();
    };

    for (const eventName of ROUTE_EVENTS) {
      window.addEventListener(eventName, schedule, true);
    }

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    window.addEventListener("yt-focus-history", schedule, true);
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];
    if (typeof original !== "function" || original.__ytFocusWrapped) {
      return;
    }

    const wrapped = function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event("yt-focus-history"));
      return result;
    };

    wrapped.__ytFocusWrapped = true;
    history[methodName] = wrapped;
  }

  function bindStorage() {
    FocusModeStorage.observeState((nextState) => {
      state = nextState;
      queueApply();
    });

    FocusModeStorage.observeTheme((nextTheme) => {
      theme = nextTheme;
      queueApply();
    });
  }

  function observeDom() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList" || (!mutation.addedNodes.length && !mutation.removedNodes.length)) {
          continue;
        }

        if (isOwnMutation(mutation)) {
          continue;
        }

        if (document.body && mutation.target === document.documentElement) {
          observer.disconnect();
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }

        if (state.focusEnabled) {
          queueApply();
          return;
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function isOwnMutation(mutation) {
    return isPlaceholderNode(mutation.target)
      || nodesAreOnlyPlaceholder(mutation.addedNodes)
      || nodesAreOnlyPlaceholder(mutation.removedNodes);
  }

  function nodesAreOnlyPlaceholder(nodes) {
    return nodes.length > 0 && [...nodes].every(isPlaceholderNode);
  }

  function isPlaceholderNode(node) {
    return node
      && node.nodeType === Node.ELEMENT_NODE
      && (node.id === PLACEHOLDER_ID || node.closest?.(`#${PLACEHOLDER_ID}`));
  }

  function queueApply() {
    if (applyTimer) {
      return;
    }

    applyTimer = window.setTimeout(() => {
      applyTimer = 0;
      applyState();
    }, DEBOUNCE_MS);
  }

  function applyState() {
    state = FocusModeStorage.normalizeState(state);
    theme = FocusModeStorage.normalizeTheme(theme);

    const route = getRouteState();
    const focusOn = state.focusEnabled;
    const root = document.documentElement;

    root.classList.toggle("yt-focus-enabled", focusOn);
    root.classList.toggle("yt-focus-blocked", focusOn && route.blocked);
    root.classList.toggle("yt-focus-watch", focusOn && route.watchPage);
    root.dataset.ytFocusTheme = theme;

    const placeholder = ensurePlaceholder();
    if (placeholder) {
      placeholder.hidden = !(focusOn && route.blocked);
    }

    if (!focusOn) {
      restoreManagedElements();
      return;
    }

    hideDynamicElements();
  }

  function getRouteState() {
    const path = location.pathname;
    const blocked = !ALLOWED_ROUTES.has(path);

    return {
      blocked,
      watchPage: path === "/watch"
    };
  }

  function ensurePlaceholder() {
    const mount = document.documentElement;
    if (!mount) {
      return null;
    }

    let placeholder = document.getElementById(PLACEHOLDER_ID);

    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.id = PLACEHOLDER_ID;
      placeholder.hidden = true;
      placeholder.innerHTML = `
        <div class="yt-focus-shell">
          <header class="yt-focus-header">
            <button class="yt-focus-home" type="button" aria-label="Focus search">
              <span class="yt-focus-home-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 7.5 16 12 9 16.5Z" fill="currentColor"></path>
                </svg>
              </span>
              <span>YouTube</span>
            </button>

            <form class="yt-focus-search" action="/results" method="get" role="search">
              <input
                class="yt-focus-search-input"
                type="search"
                name="search_query"
                placeholder="Search YouTube"
                autocomplete="off"
                spellcheck="false"
                aria-label="Search YouTube"
              >
              <button class="yt-focus-search-button" type="submit" aria-label="Search">Search</button>
            </form>
          </header>

          <div class="yt-focus-screen">
            <div class="yt-focus-aura"></div>
            <div class="yt-focus-pulse"></div>
            <div class="yt-focus-card">
              <span class="yt-focus-badge">Focus Mode</span>
              <strong class="yt-focus-title">Stay focused.</strong>
              <span class="yt-focus-copy">Distractions are hidden.</span>
            </div>
          </div>
        </div>
      `;
      bindPlaceholderActions(placeholder);
      mount.appendChild(placeholder);
    }

    return placeholder;
  }

  function bindPlaceholderActions(placeholder) {
    const homeButton = placeholder.querySelector(".yt-focus-home");
    const searchForm = placeholder.querySelector(".yt-focus-search");
    const searchInput = placeholder.querySelector(".yt-focus-search-input");

    homeButton?.addEventListener("click", () => {
      searchInput?.focus();
      searchInput?.select();
    });

    searchForm?.addEventListener("submit", (event) => {
      if (!searchInput?.value.trim()) {
        event.preventDefault();
        searchInput?.focus();
      }
    });
  }

  function hideDynamicElements() {
    for (const link of document.querySelectorAll(SHORTS_LINK_SELECTOR)) {
      hideElement(link.closest(SHORTS_CONTAINER_SELECTOR));
    }

    for (const link of document.querySelectorAll(GUIDE_LINK_SELECTOR)) {
      hideElement(link.closest(GUIDE_CONTAINER_SELECTOR));
    }

    for (const panel of document.querySelectorAll(NOTIFICATION_PANEL_SELECTOR)) {
      if (panel.querySelector("ytd-notification-renderer")) {
        hideElement(panel);
      }
    }
  }

  function hideElement(element) {
    if (!element || element.id === PLACEHOLDER_ID || element.closest?.(`#${PLACEHOLDER_ID}`)) {
      return;
    }

    if (!element.hasAttribute(MANAGED_ATTR)) {
      element.setAttribute(MANAGED_ATTR, "1");
      element.setAttribute(MANAGED_PREV_HIDDEN_ATTR, element.hidden ? "1" : "0");
    }

    element.hidden = true;
  }

  function restoreManagedElements() {
    for (const element of document.querySelectorAll(`[${MANAGED_ATTR}="1"]`)) {
      element.hidden = element.getAttribute(MANAGED_PREV_HIDDEN_ATTR) === "1";
      element.removeAttribute(MANAGED_ATTR);
      element.removeAttribute(MANAGED_PREV_HIDDEN_ATTR);
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html.yt-focus-enabled #guide-button,
      html.yt-focus-enabled ytd-mini-guide-renderer,
      html.yt-focus-enabled ytd-guide-renderer,
      html.yt-focus-enabled tp-yt-app-drawer,
      html.yt-focus-enabled #voice-search-button,
      html.yt-focus-enabled ytd-notification-topbar-button-renderer,
      html.yt-focus-enabled ytd-rich-grid-renderer,
      html.yt-focus-enabled ytd-comments,
      html.yt-focus-enabled #comments,
      html.yt-focus-enabled #related,
      html.yt-focus-enabled #secondary,
      html.yt-focus-enabled ytd-watch-next-secondary-results-renderer,
      html.yt-focus-enabled ytd-merch-shelf-renderer,
      html.yt-focus-enabled ytd-reel-shelf-renderer,
      html.yt-focus-enabled ytd-rich-shelf-renderer[is-shorts] {
        display: none !important;
      }

      html.yt-focus-enabled #masthead #start,
      html.yt-focus-enabled #masthead #end {
        visibility: hidden !important;
        pointer-events: none !important;
        display: flex !important;
        flex: 0 0 140px !important;
        min-width: 140px !important;
      }

      html.yt-focus-enabled #masthead #center {
        margin: 0 auto !important;
      }

      html.yt-focus-watch ytd-watch-flexy[is-two-columns_] #columns {
        display: block !important;
      }

      html.yt-focus-watch ytd-watch-flexy[is-two-columns_] #primary {
        width: min(1120px, calc(100vw - 48px)) !important;
        max-width: 1120px !important;
        margin: 0 auto !important;
      }

      html.yt-focus-blocked ytd-page-manager,
      html.yt-focus-blocked ytd-masthead,
      html.yt-focus-blocked #masthead-container {
        display: none !important;
      }

      #${PLACEHOLDER_ID} {
        position: fixed;
        /* Pin to the viewport with viewport units so the overlay can never
           collapse to a narrow strip if a host ancestor (transform/filter/
           contain/will-change) becomes the containing block for position:fixed.
           Do NOT use inset/right/bottom here: combined with width/height:100vw/vh
           they over-constrain and the browser honors a narrow containing block. */
        top: 0;
        left: 0;
        right: auto;
        bottom: auto;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        margin: 0;
        z-index: 2147483647;
        display: none;
        pointer-events: auto;
        overflow: hidden;
      }

      html.yt-focus-blocked #${PLACEHOLDER_ID} {
        display: grid;
      }

      .yt-focus-shell {
        position: relative;
        width: 100vw;
        height: 100vh;
      }

      .yt-focus-header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 2;
        display: grid;
        grid-template-columns: auto minmax(320px, 640px) auto;
        align-items: center;
        gap: 16px;
        padding: 18px 24px 0;
      }

      .yt-focus-home {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        justify-self: start;
        min-height: 48px;
        padding: 0 18px 0 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(17, 17, 17, 0.08);
        box-shadow: 0 14px 28px rgba(17, 17, 17, 0.08);
        color: #111111;
        font: 600 15px/1 "SF Pro Text", "Helvetica Neue", sans-serif;
        letter-spacing: -0.02em;
        text-decoration: none;
        backdrop-filter: blur(18px);
        cursor: pointer;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-home {
        background: rgba(24, 24, 24, 0.78);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22);
        color: #f5f5f5;
      }

      .yt-focus-home-mark {
        display: inline-grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: #ff0033;
        color: #ffffff;
      }

      .yt-focus-home-mark svg {
        width: 18px;
        height: 18px;
        display: block;
      }

      .yt-focus-search {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        justify-self: center;
        width: 100%;
        min-height: 56px;
        padding: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(17, 17, 17, 0.08);
        box-shadow: 0 18px 36px rgba(17, 17, 17, 0.08);
        backdrop-filter: blur(18px);
      }

      html[data-yt-focus-theme="dark"] .yt-focus-search {
        background: rgba(24, 24, 24, 0.78);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22);
      }

      .yt-focus-search-input,
      .yt-focus-search-button {
        border: 0;
        outline: 0;
        font-family: "SF Pro Text", "Helvetica Neue", sans-serif;
      }

      .yt-focus-search-input {
        width: 100%;
        min-width: 0;
        height: 40px;
        padding: 0 18px;
        border-radius: 999px;
        background: transparent;
        color: #111111;
        font-size: 15px;
      }

      .yt-focus-search-input::placeholder {
        color: rgba(17, 17, 17, 0.46);
      }

      html[data-yt-focus-theme="dark"] .yt-focus-search-input {
        color: #f5f5f5;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-search-input::placeholder {
        color: rgba(255, 255, 255, 0.48);
      }

      .yt-focus-search-button {
        height: 40px;
        padding: 0 18px;
        border-radius: 999px;
        background: #111111;
        color: #f5f5f5;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.01em;
        cursor: pointer;
        transition: transform 180ms ease, background 180ms ease, color 180ms ease;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-search-button {
        background: #f5f5f5;
        color: #111111;
      }

      .yt-focus-home:hover,
      .yt-focus-search-button:hover {
        transform: translateY(-1px);
      }

      .yt-focus-home:focus-visible,
      .yt-focus-search-input:focus-visible,
      .yt-focus-search-button:focus-visible {
        outline: 3px solid rgba(255, 0, 51, 0.34);
        outline-offset: 3px;
      }

      .yt-focus-screen {
        position: relative;
        display: grid;
        place-items: center;
        width: 100vw;
        height: 100vh;
        padding: 112px 32px 32px;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0.985) 38%, rgba(242, 242, 239, 1) 100%);
      }

      html[data-yt-focus-theme="dark"] .yt-focus-screen {
        background:
          radial-gradient(circle at top, rgba(42, 42, 42, 1), rgba(18, 18, 18, 1) 44%, rgba(10, 10, 10, 1) 100%);
      }

      .yt-focus-aura,
      .yt-focus-pulse {
        position: absolute;
        border-radius: 999px;
        filter: blur(1px);
      }

      .yt-focus-aura {
        width: min(72vw, 780px);
        height: min(72vw, 780px);
        background: radial-gradient(circle, rgba(17, 17, 17, 0.12), rgba(17, 17, 17, 0) 68%);
        animation: yt-focus-breathe 5.4s ease-in-out infinite;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-aura {
        background: radial-gradient(circle, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 68%);
      }

      .yt-focus-pulse {
        width: min(42vw, 420px);
        height: min(42vw, 420px);
        border: 1px solid rgba(17, 17, 17, 0.12);
        animation: yt-focus-ring 3.2s ease-out infinite;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-pulse {
        border-color: rgba(255, 255, 255, 0.14);
      }

      .yt-focus-card {
        position: relative;
        z-index: 1;
        display: grid;
        justify-items: center;
        gap: 12px;
        min-width: min(100%, 400px);
        padding: 32px 36px;
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(17, 17, 17, 0.08);
        box-shadow: 0 24px 60px rgba(17, 17, 17, 0.14);
        color: #111111;
        text-align: center;
        backdrop-filter: blur(18px);
        animation: yt-focus-fade 240ms ease;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-card {
        background: rgba(24, 24, 24, 0.92);
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
        color: #f5f5f5;
      }

      .yt-focus-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 14px;
        border-radius: 999px;
        background: rgba(17, 17, 17, 0.06);
        color: inherit;
        font: 600 12px/1 "SF Pro Text", "Helvetica Neue", sans-serif;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-badge {
        background: rgba(255, 255, 255, 0.08);
      }

      .yt-focus-title {
        font: 600 34px/1 "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
        letter-spacing: -0.06em;
      }

      .yt-focus-copy {
        color: rgba(17, 17, 17, 0.58);
        font: 500 15px/1.5 "SF Pro Text", "Helvetica Neue", sans-serif;
      }

      html[data-yt-focus-theme="dark"] .yt-focus-copy {
        color: rgba(255, 255, 255, 0.68);
      }

      @keyframes yt-focus-fade {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes yt-focus-breathe {
        0%,
        100% {
          transform: scale(0.94);
          opacity: 0.72;
        }

        50% {
          transform: scale(1.04);
          opacity: 1;
        }
      }

      @keyframes yt-focus-ring {
        0% {
          transform: scale(0.84);
          opacity: 0;
        }

        20% {
          opacity: 0.72;
        }

        100% {
          transform: scale(1.24);
          opacity: 0;
        }
      }

      @media (max-width: 900px) {
        .yt-focus-header {
          grid-template-columns: 1fr;
          gap: 12px;
          padding: 18px 16px 0;
        }

        .yt-focus-home,
        .yt-focus-search {
          justify-self: stretch;
        }

        .yt-focus-home {
          width: fit-content;
        }

        .yt-focus-screen {
          align-items: start;
          padding: 156px 18px 24px;
        }

        .yt-focus-card {
          width: 100%;
          min-width: 0;
          padding: 26px 22px;
          border-radius: 24px;
        }

        .yt-focus-title {
          font-size: 30px;
        }
      }

      @media (max-width: 520px) {
        .yt-focus-search {
          grid-template-columns: 1fr;
          border-radius: 24px;
        }

        .yt-focus-search-button {
          width: 100%;
        }

        .yt-focus-screen {
          padding-top: 198px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .yt-focus-aura,
        .yt-focus-pulse,
        .yt-focus-card {
          animation: none;
        }

        .yt-focus-home,
        .yt-focus-search-button {
          transition: none;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }
})();
