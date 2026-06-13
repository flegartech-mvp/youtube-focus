(() => {
  const STATE_KEY = "focusModeState";
  const THEME_KEY = "focusModeTheme";
  const DEFAULT_THEME = "light";
  const DEFAULT_STATE = Object.freeze({
    focusEnabled: false,
    lockEnabled: false,
    lockEndTime: null
  });

  function cloneState(state) {
    return {
      focusEnabled: state.focusEnabled,
      lockEnabled: state.lockEnabled,
      lockEndTime: state.lockEndTime
    };
  }

  function normalizeState(input, now = Date.now()) {
    const source = input && typeof input === "object" ? input : {};
    const focusEnabled = typeof source.focusEnabled === "boolean"
      ? source.focusEnabled
      : DEFAULT_STATE.focusEnabled;
    const lockEnabled = typeof source.lockEnabled === "boolean"
      ? source.lockEnabled
      : DEFAULT_STATE.lockEnabled;
    const lockEndTime = Number.isFinite(source.lockEndTime) ? source.lockEndTime : null;

    if (!lockEnabled || lockEndTime === null || lockEndTime <= now) {
      return {
        focusEnabled: Boolean(focusEnabled),
        lockEnabled: false,
        lockEndTime: null
      };
    }

    return {
      focusEnabled: true,
      lockEnabled: true,
      lockEndTime
    };
  }

  function normalizeTheme(input) {
    return input === "dark" ? "dark" : DEFAULT_THEME;
  }

  function stateEquals(left, right) {
    return left.focusEnabled === right.focusEnabled
      && left.lockEnabled === right.lockEnabled
      && left.lockEndTime === right.lockEndTime;
  }

  function isCanonicalState(input) {
    if (!input || typeof input !== "object") {
      return false;
    }

    const keys = Object.keys(input).sort();
    return keys.length === 3
      && keys[0] === "focusEnabled"
      && keys[1] === "lockEnabled"
      && keys[2] === "lockEndTime";
  }

  function storageGet(defaults) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(defaults, (result) => {
          const errorMessage = chrome.runtime?.lastError?.message;
          if (errorMessage) {
            reject(new Error(errorMessage));
            return;
          }

          resolve(result || defaults);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function storageSet(payload) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(payload, () => {
          const errorMessage = chrome.runtime?.lastError?.message;
          if (errorMessage) {
            reject(new Error(errorMessage));
            return;
          }

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function getState() {
    const result = await storageGet({ [STATE_KEY]: DEFAULT_STATE });
    const rawState = result[STATE_KEY];
    const normalizedState = normalizeState(rawState);

    if (!isCanonicalState(rawState) || !stateEquals(normalizedState, rawState)) {
      await storageSet({ [STATE_KEY]: normalizedState });
    }

    return cloneState(normalizedState);
  }

  async function setState(nextState) {
    const normalizedState = normalizeState(nextState);
    await storageSet({ [STATE_KEY]: normalizedState });
    return cloneState(normalizedState);
  }

  async function updateState(patch) {
    const currentState = await getState();
    const partial = typeof patch === "function"
      ? patch(cloneState(currentState))
      : patch;
    const nextState = normalizeState({ ...currentState, ...(partial || {}) });

    if (stateEquals(currentState, nextState)) {
      return cloneState(currentState);
    }

    await storageSet({ [STATE_KEY]: nextState });
    return cloneState(nextState);
  }

  async function getTheme() {
    const result = await storageGet({ [THEME_KEY]: DEFAULT_THEME });
    const theme = normalizeTheme(result[THEME_KEY]);

    if (theme !== result[THEME_KEY]) {
      await storageSet({ [THEME_KEY]: theme });
    }

    return theme;
  }

  async function setTheme(nextTheme) {
    const theme = normalizeTheme(nextTheme);
    await storageSet({ [THEME_KEY]: theme });
    return theme;
  }

  function observeState(listener) {
    const wrapped = (changes, areaName) => {
      if (areaName !== "local" || !changes[STATE_KEY]) {
        return;
      }

      listener(normalizeState(changes[STATE_KEY].newValue));
    };

    chrome.storage.onChanged.addListener(wrapped);
    return () => chrome.storage.onChanged.removeListener(wrapped);
  }

  function observeTheme(listener) {
    const wrapped = (changes, areaName) => {
      if (areaName !== "local" || !changes[THEME_KEY]) {
        return;
      }

      listener(normalizeTheme(changes[THEME_KEY].newValue));
    };

    chrome.storage.onChanged.addListener(wrapped);
    return () => chrome.storage.onChanged.removeListener(wrapped);
  }

  function isLocked(state, now = Date.now()) {
    const normalizedState = normalizeState(state, now);
    return normalizedState.lockEnabled && normalizedState.lockEndTime !== null;
  }

  function getRemainingMs(state, now = Date.now()) {
    const normalizedState = normalizeState(state, now);
    if (!normalizedState.lockEnabled || normalizedState.lockEndTime === null) {
      return 0;
    }

    return Math.max(0, normalizedState.lockEndTime - now);
  }

  self.FocusModeStorage = {
    STATE_KEY,
    THEME_KEY,
    DEFAULT_STATE: cloneState(DEFAULT_STATE),
    DEFAULT_THEME,
    normalizeState,
    normalizeTheme,
    isLocked,
    getRemainingMs,
    getState,
    setState,
    updateState,
    getTheme,
    setTheme,
    observeState,
    observeTheme
  };
})();
