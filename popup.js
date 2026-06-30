const LOCK_PRESETS = [25, 50, 90];
const DONATE_URL = "https://paypal.me/TiniFlegar";

const focusToggle = document.getElementById("focus-toggle");
const focusStatus = document.getElementById("focus-status");
const lockIndicator = document.getElementById("lock-indicator");
const timerGrid = document.getElementById("timer-grid");
const customWrap = document.getElementById("custom-wrap");
const customDuration = document.getElementById("custom-duration");
const lockButton = document.getElementById("lock-button");
const themeToggle = document.getElementById("theme-toggle");
const themeToggleLabel = document.getElementById("theme-toggle-label");
const donateButton = document.getElementById("donate-button");
const popupError = document.getElementById("popup-error");
const customDurationHelp = document.getElementById("custom-duration-help");

let state = FocusModeStorage.DEFAULT_STATE;
let theme = FocusModeStorage.DEFAULT_THEME;
let selectedDuration = String(LOCK_PRESETS[0]);
let countdownTimer = 0;
let hasStorageError = false;

initialize();

async function initialize() {
  try {
    const [nextState, nextTheme] = await Promise.all([
      FocusModeStorage.getState(),
      FocusModeStorage.getTheme()
    ]);

    state = nextState;
    theme = nextTheme;
  } catch (error) {
    hasStorageError = true;
    console.error("Focus Mode popup failed to load saved settings.", error);
  }

  render();
  startCountdown();

  focusToggle.addEventListener("click", handleFocusToggle);
  timerGrid.addEventListener("click", handleTimerSelect);
  timerGrid.addEventListener("keydown", handleTimerKeydown);
  lockButton.addEventListener("click", handleLockStart);
  customDuration.addEventListener("input", handleCustomDurationInput);
  customDuration.addEventListener("change", handleCustomDurationCommit);
  themeToggle.addEventListener("click", handleThemeToggle);
  donateButton.addEventListener("click", handleDonate);
  window.addEventListener("unload", () => {
    window.clearInterval(countdownTimer);
  });

  FocusModeStorage.observeState((nextStateUpdate) => {
    state = nextStateUpdate;
    render();
  });

  FocusModeStorage.observeTheme((nextThemeUpdate) => {
    theme = nextThemeUpdate;
    render();
  });
}

async function handleFocusToggle() {
  try {
    state = await FocusModeStorage.getState();

    if (FocusModeStorage.isLocked(state) && state.focusEnabled) {
      render();
      return;
    }

    state = await FocusModeStorage.updateState({
      focusEnabled: !state.focusEnabled
    });
    hasStorageError = false;
  } catch (error) {
    hasStorageError = true;
    console.error("Focus Mode popup could not update focus state.", error);
  } finally {
    render();
  }
}

function handleTimerSelect(event) {
  const chip = event.target.closest(".timer-chip");
  if (!chip) {
    return;
  }

  selectedDuration = chip.dataset.duration;
  if (selectedDuration !== "custom") {
    customDuration.value = selectedDuration;
  }

  renderTimerSelection();
}

function handleTimerKeydown(event) {
  const chips = [...timerGrid.querySelectorAll(".timer-chip")];
  const currentIndex = chips.indexOf(document.activeElement);
  if (currentIndex === -1) {
    return;
  }

  const movement = {
    ArrowLeft: -1,
    ArrowUp: -1,
    ArrowRight: 1,
    ArrowDown: 1
  }[event.key];

  if (!movement && event.key !== "Home" && event.key !== "End") {
    return;
  }

  event.preventDefault();

  let nextIndex = currentIndex + movement;
  if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = chips.length - 1;
  } else {
    nextIndex = (nextIndex + chips.length) % chips.length;
  }

  const nextChip = chips[nextIndex];
  selectedDuration = nextChip.dataset.duration;
  if (selectedDuration !== "custom") {
    customDuration.value = selectedDuration;
  }

  renderTimerSelection();
  nextChip.focus();
}

async function handleLockStart() {
  if (!isCustomDurationValid()) {
    customDuration.focus();
    render();
    return;
  }

  const durationMinutes = getSelectedDuration();
  if (selectedDuration === "custom") {
    customDuration.value = String(durationMinutes);
  }

  const lockEndTime = Date.now() + (durationMinutes * 60_000);

  try {
    state = await FocusModeStorage.setState({
      focusEnabled: true,
      lockEnabled: true,
      lockEndTime
    });
    hasStorageError = false;
  } catch (error) {
    hasStorageError = true;
    console.error("Focus Mode popup could not start the soft lock.", error);
  }

  render();
}

function handleCustomDurationInput() {
  render();
}

function handleCustomDurationCommit() {
  const value = Number(customDuration.value);
  if (Number.isInteger(value)) {
    customDuration.value = String(clampDuration(value));
  }

  render();
}

async function handleThemeToggle() {
  try {
    theme = await FocusModeStorage.setTheme(theme === "light" ? "dark" : "light");
    hasStorageError = false;
  } catch (error) {
    hasStorageError = true;
    console.error("Focus Mode popup could not update theme.", error);
  }

  render();
}

function handleDonate() {
  if (globalThis.chrome?.tabs?.create) {
    globalThis.chrome.tabs.create({ url: DONATE_URL });
    return;
  }

  window.open(DONATE_URL, "_blank", "noopener");
}

function render() {
  const locked = FocusModeStorage.isLocked(state);
  const enabled = state.focusEnabled;
  const remainingMs = FocusModeStorage.getRemainingMs(state);

  document.body.dataset.theme = theme;
  document.body.dataset.enabled = String(enabled);
  document.body.dataset.locked = String(locked);
  document.body.dataset.error = String(hasStorageError);

  focusToggle.setAttribute("aria-checked", String(enabled));
  focusToggle.disabled = hasStorageError || (locked && enabled);

  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggleLabel.textContent = theme === "light" ? "Dark" : "Light";
  popupError.hidden = !hasStorageError;

  const customDurationValid = isCustomDurationValid();

  if (hasStorageError) {
    focusStatus.textContent = "Settings unavailable";
    lockIndicator.hidden = true;
    lockButton.textContent = "Start lock";
    lockButton.disabled = true;
  } else if (locked && enabled) {
    focusStatus.textContent = "Soft lock active";
    lockIndicator.hidden = false;
    lockIndicator.textContent = `Soft lock: ${formatRemaining(remainingMs)} remaining`;
    lockButton.textContent = "Soft lock active";
    lockButton.disabled = true;
  } else {
    focusStatus.textContent = enabled ? "Distractions hidden" : "YouTube restored";
    lockIndicator.hidden = true;
    lockButton.textContent = customDurationValid
      ? `Start ${formatDuration(getSelectedDuration())} soft lock`
      : "Enter a valid duration";
    lockButton.disabled = !customDurationValid;
  }

  renderTimerSelection();
}

function renderTimerSelection() {
  for (const chip of timerGrid.querySelectorAll(".timer-chip")) {
    const active = chip.dataset.duration === selectedDuration;
    chip.classList.toggle("is-selected", active);
    chip.setAttribute("aria-checked", String(active));
    chip.tabIndex = active ? 0 : -1;
  }

  customWrap.hidden = selectedDuration !== "custom";
  renderCustomDurationValidity();
}

function getSelectedDuration() {
  if (selectedDuration === "custom") {
    const value = Number(customDuration.value);
    return Number.isInteger(value)
      ? clampDuration(value)
      : LOCK_PRESETS[0];
  }

  return Number.parseInt(selectedDuration, 10) || LOCK_PRESETS[0];
}

function clampDuration(durationMinutes) {
  return Math.min(Math.max(durationMinutes, 1), 480);
}

function renderCustomDurationValidity() {
  if (selectedDuration !== "custom") {
    customDuration.removeAttribute("aria-invalid");
    customDurationHelp.textContent = "Choose 1 to 480 minutes.";
    return;
  }

  const valid = isCustomDurationValid();

  customDuration.setAttribute("aria-invalid", String(!valid));
  customDurationHelp.textContent = valid
    ? "Choose 1 to 480 minutes."
    : "Enter a whole number from 1 to 480.";
}

function isCustomDurationValid() {
  if (selectedDuration !== "custom") {
    return true;
  }

  const value = Number(customDuration.value);
  return Number.isInteger(value) && value >= 1 && value <= 480;
}

function formatDuration(durationMinutes) {
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatRemaining(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const totalMinutes = Math.ceil(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${totalMinutes} min`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function startCountdown() {
  window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(async () => {
    if (!state.lockEnabled) {
      return;
    }

    const remainingMs = FocusModeStorage.getRemainingMs(state);
    if (remainingMs > 0) {
      lockIndicator.textContent = `Soft lock: ${formatRemaining(remainingMs)} remaining`;
      return;
    }

    try {
      state = await FocusModeStorage.updateState({
        lockEnabled: false,
        lockEndTime: null
      });
      hasStorageError = false;
    } catch (error) {
      hasStorageError = true;
      console.error("Focus Mode popup could not clear the expired soft lock.", error);
    }

    render();
  }, 1000);
}
