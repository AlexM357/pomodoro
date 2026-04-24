(() => {
  const durationMinutesEl = document.getElementById("durationMinutes");
  const durationRangeEl = document.getElementById("durationRange");
  const durationPrettyEl = document.getElementById("durationPretty");
  const durationErrorEl = document.getElementById("durationError");

  const alternateDurationMinutesEl = document.getElementById("alternateDurationMinutes");
  const alternateDurationRangeEl = document.getElementById("alternateDurationRange");
  const alternateDurationPrettyEl = document.getElementById("alternateDurationPretty");
  const alternateDurationErrorEl = document.getElementById("alternateDurationError");

  const cyclesEl = document.getElementById("cycles");
  const cyclesRangeEl = document.getElementById("cyclesRange");
  const cyclesPrettyEl = document.getElementById("cyclesPretty");
  const cyclesErrorEl = document.getElementById("cyclesError");

  const iterationTextEl = document.getElementById("iterationText");
  const statusTextEl = document.getElementById("statusText");
  const timeTextEl = document.getElementById("timeText");
  const progressBarEl = document.getElementById("progressBar");
  const phaseNameEl = document.getElementById("phaseName");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");

  const settingsToastEl = document.getElementById("settingsToast");
  const toastCloseBtn = document.getElementById("toastCloseBtn");
  const toastCancelBtn = document.getElementById("toastCancelBtn");
  const toastStartBtn = document.getElementById("toastStartBtn");
  const bodyEl = document.body;
  const toastOverlayEl = settingsToastEl ? settingsToastEl.querySelector(".toast__overlay") : null;
  const toastDialogEl = settingsToastEl ? settingsToastEl.querySelector(".toast__dialog") : null;
  let lastFocusEl = null;

  const PHASES = [
    { key: "primary", label: "Работа" },
    { key: "secondary", label: "Отдых" },
  ];

  const state = {
    running: false,
    paused: false,
    durationMs: 0,
    phaseDurationsMs: [],
    cyclesTotal: 3,
    iterationIndex: 1,
    phaseIndex: 0,
    endAtPerf: 0,
    remainingMs: 0,
    timerHandle: null,
  };

  const DURATION_MIN_MINUTES = 1;
  const DURATION_MAX_MINUTES = 480;
  const DURATION_STEP_MINUTES = 1;

  const CYCLES_MIN = 1;
  const CYCLES_MAX = 8;

  function clampToStep(value, step, min, max) {
    const clamped = Math.min(Math.max(value, min), max);
    const steps = Math.round((clamped - min) / step);
    return min + steps * step;
  }

  function parseIntSafe(value) {
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) ? n : NaN;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatHMS(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  function formatMM(minutes) {
    const m = Math.max(0, Math.floor(minutes));
    const hours = Math.floor(m / 60);
    const remMin = m % 60;
    if (hours <= 0) return `00:${pad2(remMin)}`;
    return `${pad2(hours)}:${pad2(remMin)}`;
  }

  function setError(el, msg) {
    el.textContent = msg || "";
  }

  function validateDurationMinutes(raw) {
    const value = clampToStep(raw, DURATION_STEP_MINUTES, DURATION_MIN_MINUTES, DURATION_MAX_MINUTES);
    if (!Number.isFinite(value)) {
      return { ok: false, value: DURATION_MIN_MINUTES, error: "Укажите длительность." };
    }
    return { ok: true, value, error: "" };
  }

  function validateCycles(raw) {
    const value = Math.min(Math.max(raw, CYCLES_MIN), CYCLES_MAX);
    if (!Number.isFinite(value)) {
      return { ok: false, value: CYCLES_MIN, error: "Укажите количество итераций." };
    }
    return { ok: true, value, error: "" };
  }

  function setInputsEnabled(enabled) {
    durationMinutesEl.disabled = !enabled;
    durationRangeEl.disabled = !enabled;
    alternateDurationMinutesEl.disabled = !enabled;
    alternateDurationRangeEl.disabled = !enabled;
    cyclesEl.disabled = !enabled;
    cyclesRangeEl.disabled = !enabled;

    startBtn.disabled = !enabled;
    if (enabled) {
      pauseBtn.disabled = true;
      resetBtn.disabled = true;
      pauseBtn.textContent = "Пауза";
    }
  }

  function getPhaseMeta(phaseIndex = state.phaseIndex) {
    return PHASES[phaseIndex] || PHASES[0];
  }

  function getPhaseDurationMs(phaseIndex = state.phaseIndex, phaseDurationsMs = state.phaseDurationsMs) {
    return phaseDurationsMs[phaseIndex] || 0;
  }

  function renderPhaseName(phaseIndex = state.phaseIndex) {
    if (!phaseNameEl) return;
    phaseNameEl.textContent = getPhaseMeta(phaseIndex).label;
  }

  function renderIterationText(iterationIndex, cyclesTotal, phaseDurationsMs) {
    const primaryDuration = formatMM((phaseDurationsMs[0] || 0) / 60000);
    const secondaryDuration = formatMM((phaseDurationsMs[1] || 0) / 60000);
    iterationTextEl.textContent = `Итерация ${iterationIndex} / ${cyclesTotal} • ${primaryDuration} / ${secondaryDuration}`;
  }

  function computeFromInputs() {
    const durationRaw = parseIntSafe(durationMinutesEl.value);
    const alternateDurationRaw = parseIntSafe(alternateDurationMinutesEl.value);
    const cyclesRaw = parseIntSafe(cyclesEl.value);

    const durationRes = validateDurationMinutes(durationRaw);
    const alternateDurationRes = validateDurationMinutes(alternateDurationRaw);
    const cyclesRes = validateCycles(cyclesRaw);

    setError(durationErrorEl, durationRes.error);
    setError(alternateDurationErrorEl, alternateDurationRes.error);
    setError(cyclesErrorEl, cyclesRes.error);

    durationMinutesEl.value = String(durationRes.value);
    durationRangeEl.value = String(durationRes.value);
    alternateDurationMinutesEl.value = String(alternateDurationRes.value);
    alternateDurationRangeEl.value = String(alternateDurationRes.value);
    cyclesEl.value = String(cyclesRes.value);
    cyclesRangeEl.value = String(cyclesRes.value);

    durationPrettyEl.textContent = formatMM(durationRes.value);
    alternateDurationPrettyEl.textContent = formatMM(alternateDurationRes.value);
    cyclesPrettyEl.textContent = String(cyclesRes.value);

    return {
      phaseDurationsMs: [
        durationRes.value * 60 * 1000,
        alternateDurationRes.value * 60 * 1000,
      ],
      cyclesTotal: cyclesRes.value,
    };
  }

  function updateStaticUI() {
    const durationMinutes = parseIntSafe(durationMinutesEl.value);
    const alternateDurationMinutes = parseIntSafe(alternateDurationMinutesEl.value);
    const cycles = parseIntSafe(cyclesEl.value);

    const safeDuration = clampToStep(durationMinutes, DURATION_STEP_MINUTES, DURATION_MIN_MINUTES, DURATION_MAX_MINUTES);
    const safeAlternateDuration = clampToStep(
      alternateDurationMinutes,
      DURATION_STEP_MINUTES,
      DURATION_MIN_MINUTES,
      DURATION_MAX_MINUTES,
    );
    const safeCycles = Math.min(Math.max(cycles, CYCLES_MIN), CYCLES_MAX);
    const phaseDurationsMs = [safeDuration * 60 * 1000, safeAlternateDuration * 60 * 1000];

    state.phaseDurationsMs = phaseDurationsMs;
    durationPrettyEl.textContent = formatMM(safeDuration);
    alternateDurationPrettyEl.textContent = formatMM(safeAlternateDuration);
    cyclesPrettyEl.textContent = String(safeCycles);
    renderIterationText(1, safeCycles, phaseDurationsMs);
    renderPhaseName(0);
    timeTextEl.textContent = formatHMS(phaseDurationsMs[0]);
    progressBarEl.style.width = "0%";
  }

  function setRunningUI() {
    setInputsEnabled(false);
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
  }

  function setPausedUI() {
    pauseBtn.textContent = "Продолжить";
    statusTextEl.textContent = "Пауза. Нажмите «Продолжить».";
  }

  function setRunningStatus() {
    statusTextEl.textContent = "Идёт отсчёт.";
    pauseBtn.textContent = "Пауза";
    progressBarEl.style.width = "0%";
  }

  function setDoneUI() {
    statusTextEl.textContent = "Готово! Все итерации выполнены.";
    setInputsEnabled(true);
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Пауза";
    resetBtn.disabled = true;
  }

  function syncTheme() {
    if (!bodyEl) return;
    const useDarkTheme = state.running && !state.paused && state.phaseIndex === 0;
    bodyEl.classList.toggle("theme--running", useDarkTheme);
  }

  function clearTick() {
    if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }

  function startCurrentPhase() {
    state.durationMs = getPhaseDurationMs();
    state.remainingMs = state.durationMs;
    state.endAtPerf = performance.now() + state.durationMs;
    renderIterationText(state.iterationIndex, state.cyclesTotal, state.phaseDurationsMs);
    renderPhaseName(state.phaseIndex);
    timeTextEl.textContent = formatHMS(state.remainingMs);
    progressBarEl.style.width = "0%";
    syncTheme();
    setRunningStatus();
  }

  function tick() {
    const nowPerf = performance.now();
    state.remainingMs = state.endAtPerf - nowPerf;

    if (state.remainingMs <= 0) {
      handlePhaseFinished();
      return;
    }

    timeTextEl.textContent = formatHMS(state.remainingMs);

    const elapsed = state.durationMs - state.remainingMs;
    const progress = state.durationMs > 0 ? (elapsed / state.durationMs) * 100 : 0;
    progressBarEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  function handlePhaseFinished() {
    state.remainingMs = 0;
    timeTextEl.textContent = formatHMS(0);
    progressBarEl.style.width = "100%";

    if (state.phaseIndex < PHASES.length - 1) {
      state.phaseIndex += 1;
      startCurrentPhase();
      return;
    }

    if (state.iterationIndex < state.cyclesTotal) {
      state.iterationIndex += 1;
      state.phaseIndex = 0;
      startCurrentPhase();
      return;
    }

    state.running = false;
    state.paused = false;
    clearTick();
    syncTheme();
    setDoneUI();
    updateStaticUI();
  }

  function startTimerWith(phaseDurationsMs, cyclesTotal) {
    state.phaseDurationsMs = phaseDurationsMs;
    state.cyclesTotal = cyclesTotal;
    state.iterationIndex = 1;
    state.phaseIndex = 0;
    state.running = true;
    state.paused = false;

    setRunningUI();
    startCurrentPhase();

    clearTick();
    state.timerHandle = setInterval(tick, 250);
  }

  function startTimerFromInputs() {
    const { phaseDurationsMs, cyclesTotal } = computeFromInputs();
    const hasErrors =
      Boolean(durationErrorEl.textContent) ||
      Boolean(alternateDurationErrorEl.textContent) ||
      Boolean(cyclesErrorEl.textContent);
    if (hasErrors) return false;
    startTimerWith(phaseDurationsMs, cyclesTotal);
    return true;
  }

  function togglePause() {
    if (!state.running) return;

    if (!state.paused) {
      state.paused = true;
      clearTick();
      state.remainingMs = Math.max(0, state.endAtPerf - performance.now());
      timeTextEl.textContent = formatHMS(state.remainingMs);
      syncTheme();
      setPausedUI();
      return;
    }

    state.paused = false;
    state.endAtPerf = performance.now() + state.remainingMs;
    syncTheme();
    clearTick();
    state.timerHandle = setInterval(tick, 250);
    setRunningStatus();
  }

  function resetTimer() {
    clearTick();
    state.running = false;
    state.paused = false;
    state.durationMs = 0;
    state.phaseDurationsMs = [];
    state.cyclesTotal = 3;
    state.iterationIndex = 1;
    state.phaseIndex = 0;
    state.endAtPerf = 0;
    state.remainingMs = 0;
    syncTheme();
    setInputsEnabled(true);
    updateStaticUI();
    statusTextEl.textContent = "Готов. Нажмите «Старт».";
    pauseBtn.textContent = "Пауза";
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
  }

  function openSettingsToast() {
    if (state.running) return;
    lastFocusEl = document.activeElement;
    setInputsEnabled(true);
    computeFromInputs();
    updateStaticUI();
    if (settingsToastEl) settingsToastEl.hidden = false;
    const firstInput = durationMinutesEl || document.querySelector("#durationMinutes");
    if (firstInput && typeof firstInput.focus === "function") firstInput.focus();
  }

  function closeSettingsToast() {
    if (settingsToastEl) settingsToastEl.hidden = true;
    if (lastFocusEl && typeof lastFocusEl.focus === "function") lastFocusEl.focus();
  }

  function submitSettingsToast() {
    const started = startTimerFromInputs();
    if (started) closeSettingsToast();
  }

  function init() {
    if (settingsToastEl) settingsToastEl.hidden = true;

    syncTheme();
    updateStaticUI();
    if (bodyEl) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bodyEl.classList.add("theme-transitions-ready");
        });
      });
    }

    durationMinutesEl.addEventListener("input", () => {
      durationPrettyEl.textContent = formatMM(parseIntSafe(durationMinutesEl.value) || DURATION_MIN_MINUTES);
      if (!state.running) updateStaticUI();
    });
    durationRangeEl.addEventListener("input", () => {
      durationMinutesEl.value = durationRangeEl.value;
      durationPrettyEl.textContent = formatMM(parseIntSafe(durationRangeEl.value));
      if (!state.running) updateStaticUI();
    });

    alternateDurationMinutesEl.addEventListener("input", () => {
      alternateDurationPrettyEl.textContent = formatMM(
        parseIntSafe(alternateDurationMinutesEl.value) || DURATION_MIN_MINUTES,
      );
      if (!state.running) updateStaticUI();
    });
    alternateDurationRangeEl.addEventListener("input", () => {
      alternateDurationMinutesEl.value = alternateDurationRangeEl.value;
      alternateDurationPrettyEl.textContent = formatMM(parseIntSafe(alternateDurationRangeEl.value));
      if (!state.running) updateStaticUI();
    });

    cyclesEl.addEventListener("input", () => {
      cyclesPrettyEl.textContent = String(
        Math.min(Math.max(parseIntSafe(cyclesEl.value) || CYCLES_MIN, CYCLES_MIN), CYCLES_MAX),
      );
      if (!state.running) updateStaticUI();
    });
    cyclesRangeEl.addEventListener("input", () => {
      cyclesEl.value = cyclesRangeEl.value;
      cyclesPrettyEl.textContent = String(parseIntSafe(cyclesRangeEl.value));
      if (!state.running) updateStaticUI();
    });

    startBtn.addEventListener("click", openSettingsToast);
    pauseBtn.addEventListener("click", togglePause);
    resetBtn.addEventListener("click", resetTimer);

    toastCloseBtn?.addEventListener("click", closeSettingsToast);
    toastCancelBtn?.addEventListener("click", closeSettingsToast);
    toastStartBtn.addEventListener("click", submitSettingsToast);
    if (toastOverlayEl) toastOverlayEl.addEventListener("click", closeSettingsToast);
    if (toastDialogEl) {
      toastDialogEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && settingsToastEl && !settingsToastEl.hidden) {
        e.preventDefault();
        closeSettingsToast();
        return;
      }

      if (e.key === "Escape" && state.running) {
        e.preventDefault();
        resetTimer();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || state.running) return;
      if (settingsToastEl && !settingsToastEl.hidden) {
        e.preventDefault();
        submitSettingsToast();
        return;
      }
      openSettingsToast();
    });

    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" || !state.running) return;
      e.preventDefault();
      togglePause();
    });
  }

  const initialDuration = parseIntSafe(durationMinutesEl.value);
  const initialAlternateDuration = parseIntSafe(alternateDurationMinutesEl.value);
  const initialCycles = parseIntSafe(cyclesEl.value);
  if (!Number.isFinite(initialDuration)) durationMinutesEl.value = String(DURATION_MIN_MINUTES);
  if (!Number.isFinite(initialAlternateDuration)) alternateDurationMinutesEl.value = String(5);
  if (!Number.isFinite(initialCycles)) cyclesEl.value = String(CYCLES_MIN);

  init();
})();
