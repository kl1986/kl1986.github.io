const APP_VERSION = '1.15';
const STATUS_LABELS = ['Not done', 'Failed', 'Completed'];
const exerciseList = document.getElementById('exercise-list');
const addExerciseForm = document.getElementById('add-exercise-form');
const exerciseNameInput = document.getElementById('exercise-name');
const exerciseOptions = document.getElementById('exercise-options');
const saveTemplateBtn = document.getElementById('save-template');
const historyList = document.getElementById('history-list');
const restInput = document.getElementById('rest-input');
const timerDisplay = document.getElementById('timer-display');
const restAddBtn = document.getElementById('rest-add');
const restSubtractBtn = document.getElementById('rest-subtract');
const setTimerSection = document.getElementById('set-timer-section');
const setTimerDisplay = document.getElementById('set-timer-display');
const startSection = document.getElementById('start-section');
const templateList = document.getElementById('template-list');
const startBlankBtn = document.getElementById('start-blank');
const restSection = document.getElementById('rest-section');
const workoutSection = document.getElementById('workout-section');
const homeBtn = document.getElementById('home-button');
const addExerciseSection = document.getElementById('add-exercise-section');
const historySection = document.getElementById('history-section');
const topButtons = document.getElementById('top-buttons');
const exportBtn = document.getElementById('export-data');
const importInput = document.getElementById('import-data');
const importBtn = document.getElementById('import-data-button');
const instructionsBtn = document.getElementById('show-instructions');
const instructionsSection = document.getElementById('instructions-section');
const instructionsBack = document.getElementById('instructions-back');
const workoutTimerSection = document.getElementById('workout-timer-section');
const startWorkoutBtn = document.getElementById('start-workout');
const pauseWorkoutBtn = document.getElementById('pause-workout');
const resumeWorkoutBtn = document.getElementById('resume-workout');
const endWorkoutBtn = document.getElementById('end-workout');
const workoutTimeDisplay = document.getElementById('workout-time');
const appVersionFooter = document.getElementById('app-version');
const workoutCommentEl = document.getElementById('workout-comment');
const templateIndicator = document.getElementById('template-indicator');
const exerciseListHome = document.getElementById('exercise-list-home');
const exerciseChartSection = document.getElementById('exercise-chart-section');
const exerciseChart = document.getElementById('exercise-chart');
const exerciseChartTitle = document.getElementById('exercise-chart-title');
const exerciseChartBack = document.getElementById('exercise-chart-back');
const exerciseChartLegend = document.getElementById('exercise-chart-legend');
const exerciseSortSelect = document.getElementById('exercise-sort');
const resumeHomeBtn = document.getElementById('resume-workout-home');

let exerciseSortOrder = 'alpha';

let restTimer = null;
let restEndTime = null;
let restTotal = null;
let setTimer = null;
let currentSetProgress = null;
let workout = { exercises: [], comment: '' };
let workoutTimer = null;
let workoutStart = null;
let pausedTime = 0;
let pauseStart = null;
const WORKOUT_TIMER_KEY = 'workoutTimerState';
let currentTemplate = null;

function renderCurrentTemplate() {
  if (!templateIndicator) return;
  if (currentTemplate) {
    templateIndicator.textContent = `Template: ${currentTemplate}`;
    templateIndicator.classList.remove('hidden');
  } else {
    templateIndicator.textContent = '';
    templateIndicator.classList.add('hidden');
  }
}

function renderWorkoutComment() {
  if (!workoutCommentEl) return;
  workoutCommentEl.value = workout.comment || '';
}

function updateResumeButton() {
  if (!resumeHomeBtn) return;
  if (workout.exercises && workout.exercises.length > 0) {
    resumeHomeBtn.classList.remove('hidden');
  } else {
    resumeHomeBtn.classList.add('hidden');
  }
}

function loadWorkout() {
  const data = localStorage.getItem('currentWorkout');
  if (data) {
    workout = JSON.parse(data);
    if (!workout.exercises) workout.exercises = [];
    if (!('comment' in workout)) workout.comment = '';
    workout.exercises.forEach(ex => ex.sets.forEach(s => {
      if (!('status' in s)) {
        s.status = s.done ? 2 : 0;
      }
      delete s.done;
    }));
  }
  updateResumeButton();
}

function saveWorkout() {
  localStorage.setItem('currentWorkout', JSON.stringify(workout));
  updateResumeButton();
}

function loadHistory() {
  const data = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  data.forEach(h => {
    if (!('duration' in h)) h.duration = 0;
    if (!('comment' in h)) h.comment = '';
    if (!('template' in h)) h.template = null;
  });
  updateExerciseHistoryFromWorkouts(data);
  return data;
}

function saveHistoryEntry(exercises, duration, comment, template) {
  const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  const w = {
    id: Date.now(),
    date: new Date().toISOString(),
    exercises,
    duration,
    comment,
    template: template || null
  };
  history.push(w);
  localStorage.setItem('workoutHistory', JSON.stringify(history));
  updateExerciseHistoryFromWorkouts(history);
  return w;
}

function loadTemplates() {
  const t = JSON.parse(localStorage.getItem('workoutTemplates') || '[]');
  t.forEach(tmp => {
    if (!('comment' in tmp)) tmp.comment = '';
    if (tmp.exercises) {
      tmp.exercises.forEach(ex => ex.sets.forEach(s => {
        if (!('status' in s)) {
          s.status = s.done ? 2 : 0;
        }
        delete s.done;
      }));
    }
  });
  return t;
}

function saveTemplates(tmpl) {
  localStorage.setItem('workoutTemplates', JSON.stringify(tmpl));
}

async function confirmEndCurrentWorkout() {
  if (workout.exercises && workout.exercises.length > 0) {
    if (confirm('A workout is in progress. End it and start a new one?')) {
      await finishWorkout();
      workout = { exercises: [], comment: '' };
      workoutStart = null;
      pausedTime = 0;
      pauseStart = null;
      return true;
    } else {
      startSection.classList.add('hidden');
      showWorkoutUI(true);
      return false;
    }
  }
  return true;
}

function exportAllData() {
  const data = {
    currentWorkout: workout,
    workoutHistory: JSON.parse(localStorage.getItem('workoutHistory') || '[]'),
    workoutTemplates: JSON.parse(localStorage.getItem('workoutTemplates') || '[]'),
    exerciseHistory: loadExerciseHistory()
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const filename = `workout-data-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFromFile(file) {
  if (!file) return;
  file.text().then(str => {
    try {
      const data = JSON.parse(str);

      const mergeArraysByKey = (existing, incoming, key) => {
        const map = {};
        existing.forEach(item => { map[item[key]] = item; });
        incoming.forEach(item => { map[item[key]] = item; });
        return Object.values(map);
      };

      if (data.currentWorkout) {
        const existing = JSON.parse(localStorage.getItem('currentWorkout') || '{}');
        workout = Object.assign({}, existing, data.currentWorkout);
        if (!workout.exercises) workout.exercises = [];
        if (!('comment' in workout)) workout.comment = '';
        saveWorkout();
      }

      if (data.workoutHistory) {
        const existingHist = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
        const mergedHist = mergeArraysByKey(existingHist, data.workoutHistory, 'id');
        localStorage.setItem('workoutHistory', JSON.stringify(mergedHist));
        updateExerciseHistoryFromWorkouts(mergedHist);
      }

      if (data.workoutTemplates) {
        const existingTmpl = JSON.parse(localStorage.getItem('workoutTemplates') || '[]');
        const mergedTmpl = mergeArraysByKey(existingTmpl, data.workoutTemplates, 'name');
        localStorage.setItem('workoutTemplates', JSON.stringify(mergedTmpl));
      }

      if (data.exerciseHistory) {
        const existingHist = JSON.parse(localStorage.getItem('exerciseHistory') || '{}');
        const merged = Object.assign({}, existingHist, data.exerciseHistory);
        saveExerciseHistory(merged);
      }

      renderExerciseOptions();
      renderExerciseListHome();
      renderTemplateList();
      renderHistory();
      renderWorkout();
    } catch (e) {
      alert('Failed to import data');
    }
  });
}

function loadExerciseHistory() {
  return JSON.parse(localStorage.getItem('exerciseHistory') || '{}');
}

function saveExerciseHistory(hist) {
  localStorage.setItem('exerciseHistory', JSON.stringify(hist));
}

function updateExerciseHistoryFromWorkouts(workouts) {
  const hist = {};
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      hist[ex.name] = ex.sets;
    });
  });
  saveExerciseHistory(hist);
}

function formatDate(str) {
  const d = new Date(str);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const hour = d.getHours();
  let period = 'Evening';
  if (hour >= 5 && hour < 12) period = 'Morning';
  else if (hour >= 12 && hour < 14) period = 'Lunchtime';
  else if (hour >= 14 && hour < 18) period = 'Afternoon';
  return `${weekday} ${period}, ${date}, ${time}`;
}

function formatShortDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getStatusText(val) {
  return STATUS_LABELS[parseInt(val, 10)] || '';
}

async function renderTemplateList() {
  const templates = await loadTemplates();
  templateList.innerHTML = '';
  templates.forEach((t, i) => {
    const wrapper = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = t.name;
    btn.dataset.index = i;
    btn.className = 'tmpl-start';
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.dataset.index = i;
    delBtn.className = 'del-template';
    delBtn.title = 'Delete';
    wrapper.appendChild(btn);
    wrapper.appendChild(delBtn);
    templateList.appendChild(wrapper);
  });
}

function renderExerciseOptions() {
  const list = Object.keys(loadExerciseHistory());
  exerciseOptions.innerHTML = '';
  list.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    exerciseOptions.appendChild(opt);
  });
}

function renderExerciseListHome() {
  if (!exerciseListHome) return;
  const names = Object.keys(loadExerciseHistory());
  if (exerciseSortOrder === 'recent') {
    names.sort((a, b) => getExerciseLastDate(b) - getExerciseLastDate(a));
  } else {
    names.sort();
  }
  exerciseListHome.innerHTML = '';
  names.forEach(name => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.dataset.name = name;
    btn.className = 'exercise-home-entry';
    exerciseListHome.appendChild(btn);
  });
}

function getExerciseProgress(name) {
  const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  return history
    .filter(w => w.exercises.some(ex => ex.name === name))
    .map(w => {
      const ex = w.exercises.find(ex => ex.name === name);
      let weight = 0, reps = 0, time = 0;
      let cw = 0, cr = 0, ct = 0;
      ex.sets.forEach(s => {
        if (s.weight) { weight += Number(s.weight); cw++; }
        if (s.reps) { reps += Number(s.reps); cr++; }
        if (s.time) { time += Number(s.time); ct++; }
      });
      return {
        date: w.date,
        sets: ex.sets.length,
        weight: cw ? weight / cw : 0,
        reps: cr ? reps / cr : 0,
        time: ct ? time / ct : 0
      };
    });
}

function getExerciseLastDate(name) {
  const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  const filtered = history
    .filter(w => w.exercises.some(ex => ex.name === name))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return filtered.length ? new Date(filtered[0].date) : new Date(0);
}

function drawExerciseChart(data) {
  if (!exerciseChart) return;
  const ctx = exerciseChart.getContext('2d');
  ctx.clearRect(0, 0, exerciseChart.width, exerciseChart.height);
  const padding = 40;
  const width = exerciseChart.width - padding * 2;
  const height = exerciseChart.height - padding * 2;

  const maxLeft = Math.max(1, ...data.map(d => d.sets));
  const maxRight = Math.max(1, ...data.map(d => d.reps));
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const scaleLeft = val => height - (val / maxLeft) * height + padding;
  const scaleRight = val => height - (val / maxRight) * height + padding;

  ctx.strokeStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height + padding);
  ctx.moveTo(width + padding, padding);
  ctx.lineTo(width + padding, height + padding);
  ctx.moveTo(padding, height + padding);
  ctx.lineTo(width + padding, height + padding);
  ctx.stroke();

  const ticks = 5;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= ticks; i++) {
    const val = (maxLeft / ticks) * i;
    const y = scaleLeft(val);
    ctx.beginPath();
    ctx.moveTo(padding - 5, y);
    ctx.lineTo(padding, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(0), padding - 8, y);
  }

  ctx.textAlign = 'left';
  for (let i = 0; i <= ticks; i++) {
    const val = (maxRight / ticks) * i;
    const y = scaleRight(val);
    ctx.beginPath();
    ctx.moveTo(width + padding, y);
    ctx.lineTo(width + padding + 5, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(0), width + padding + 8, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  data.forEach((d, i) => {
    const x = padding + i * stepX;
    ctx.beginPath();
    ctx.moveTo(x, height + padding);
    ctx.lineTo(x, height + padding + 5);
    ctx.stroke();
    ctx.fillText(formatShortDate(d.date), x, height + padding + 6);
  });

  function drawLine(values, color, scale) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padding + i * stepX;
      const y = scale(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  drawLine(data.map(d => d.sets), 'red', scaleLeft);
  drawLine(data.map(d => d.reps), 'blue', scaleRight);

  if (exerciseChartLegend) {
    exerciseChartLegend.innerHTML =
      '<span class="legend-item"><span class="legend-color" style="background:red"></span>Sets</span>' +
      '<span class="legend-item"><span class="legend-color" style="background:blue"></span>Reps</span>';
  }
}

function showExerciseChart(name) {
  if (!exerciseChartSection) return;
  exerciseChartTitle.textContent = name;
  startSection.classList.add('hidden');
  exerciseChartSection.classList.remove('hidden');
  const data = getExerciseProgress(name);
  drawExerciseChart(data);
}

function showWorkoutUI(show) {
  [restSection, workoutSection, addExerciseSection, historySection, topButtons, workoutTimerSection].forEach(sec => {
    if (show) sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
}

let currentProgress = null;

function startRestTimer(setEl, seconds, totalSeconds) {
  let remaining = parseInt(seconds != null ? seconds : restInput.value, 10);
  if (!remaining || remaining <= 0) return;
  clearInterval(restTimer);
  restEndTime = Date.now() + remaining * 1000;
  restTotal = totalSeconds != null ? totalSeconds : remaining;
  localStorage.setItem('restEndTime', restEndTime);
  localStorage.setItem('restTotal', restTotal);
  timerDisplay.textContent = remaining;

  if (currentProgress && currentProgress.parentElement) {
    currentProgress.parentElement.removeChild(currentProgress);
  }

  let progressText = null;
  if (setEl) {
    const bar = document.createElement('div');
    bar.className = 'rest-progress';
    bar.innerHTML = '<div class="rest-progress-inner"></div><span class="rest-progress-text"></span>';
    setEl.appendChild(bar);
    currentProgress = bar;
    progressText = bar.querySelector('.rest-progress-text');
  }

  if (progressText) progressText.textContent = `${remaining}s / ${restTotal}s`;
  restTimer = setInterval(() => {
    remaining = Math.ceil((restEndTime - Date.now()) / 1000);
    timerDisplay.textContent = Math.max(0, remaining);
    if (currentProgress) {
      const inner = currentProgress.firstElementChild;
      inner.style.width = restTotal > 0 ? (Math.max(0, remaining) / restTotal) * 100 + '%' : '0%';
      const text = currentProgress.querySelector('.rest-progress-text');
      if (text) text.textContent = `${Math.max(0, remaining)}s / ${restTotal}s`;
    }
    if (remaining <= 0) {
      clearInterval(restTimer);
      restEndTime = null;
      restTotal = null;
      localStorage.removeItem('restEndTime');
      localStorage.removeItem('restTotal');
      playBeep();
      sendRestNotification();
    }
  }, 1000);
}

function adjustRestTime(delta) {
  if (restEndTime) {
    restEndTime += delta * 1000;
    restTotal = Math.max(0, restTotal + delta);
    localStorage.setItem('restEndTime', restEndTime);
    localStorage.setItem('restTotal', restTotal);
    let remaining = Math.ceil((restEndTime - Date.now()) / 1000);
    timerDisplay.textContent = Math.max(0, remaining);
    if (currentProgress) {
      const inner = currentProgress.firstElementChild;
      inner.style.width = restTotal > 0 ? (Math.max(0, remaining) / restTotal) * 100 + '%' : '0%';
      const text = currentProgress.querySelector('.rest-progress-text');
      if (text) text.textContent = `${Math.max(0, remaining)}s / ${restTotal}s`;
    }
    if (remaining <= 0) {
      clearInterval(restTimer);
      restEndTime = null;
      restTotal = null;
      localStorage.removeItem('restEndTime');
      localStorage.removeItem('restTotal');
      playBeep();
      sendRestNotification();
    }
  } else {
    let val = parseInt(restInput.value, 10) || 0;
    val = Math.max(0, val + delta);
    restInput.value = val;
    timerDisplay.textContent = val;
  }
}

if (restAddBtn) restAddBtn.addEventListener('click', () => adjustRestTime(5));
if (restSubtractBtn) restSubtractBtn.addEventListener('click', () => adjustRestTime(-5));

function startSetTimer(setEl, seconds) {
  let total = parseInt(seconds, 10);
  if (!total || total <= 0) return;
  clearInterval(setTimer);
  if (currentSetProgress && currentSetProgress.parentElement) {
    currentSetProgress.parentElement.removeChild(currentSetProgress);
  }
  const bar = document.createElement('div');
  bar.className = 'rest-progress';
  bar.innerHTML = '<div class="rest-progress-inner"></div><span class="rest-progress-text"></span>';
  setEl.appendChild(bar);
  currentSetProgress = bar;
  const textEl = bar.querySelector('.rest-progress-text');
  let elapsed = 0;
  if (textEl) textEl.textContent = `0s / ${total}s`;
  setTimer = setInterval(() => {
    elapsed++;
    if (currentSetProgress) {
      const inner = currentSetProgress.firstElementChild;
      inner.style.width = (elapsed / total) * 100 + '%';
      if (textEl) textEl.textContent = `${elapsed}s / ${total}s`;
    }
    if (elapsed >= total) {
      clearInterval(setTimer);
      playBeep();
      sendTimerNotification();
    }
  }, 1000);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error('Beep failed', e);
  }
}

function sendRestNotification() {
  if (Notification.permission === 'granted') {
    new Notification('Rest done, time to get working');
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        new Notification('Rest done, time to get working');
      }
    });
  }
}

function sendTimerNotification() {
  if (Notification.permission === 'granted') {
    new Notification('Timer done');
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        new Notification('Timer done');
      }
    });
  }
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startWorkoutTimer() {
  workoutStart = Date.now();
  pausedTime = 0;
  pauseStart = null;
  localStorage.setItem(WORKOUT_TIMER_KEY, JSON.stringify({ workoutStart, pausedTime, pauseStart }));
  workoutTimeDisplay.textContent = '00:00:00';
  workoutTimerSection.classList.remove('hidden');
  startWorkoutBtn.classList.add('hidden');
  pauseWorkoutBtn.classList.remove('hidden');
  endWorkoutBtn.classList.remove('hidden');
  workoutTimer = setInterval(() => {
    const now = Date.now();
    const elapsed = now - workoutStart - pausedTime;
    workoutTimeDisplay.textContent = formatTime(elapsed);
  }, 1000);
}

function pauseWorkoutTimer() {
  if (workoutTimer) {
    clearInterval(workoutTimer);
    workoutTimer = null;
    pauseStart = Date.now();
    pauseWorkoutBtn.classList.add('hidden');
    resumeWorkoutBtn.classList.remove('hidden');
    localStorage.setItem(WORKOUT_TIMER_KEY, JSON.stringify({ workoutStart, pausedTime, pauseStart }));
  }
}

function resumeWorkoutTimer() {
  if (pauseStart) {
    pausedTime += Date.now() - pauseStart;
    pauseStart = null;
    resumeWorkoutBtn.classList.add('hidden');
    pauseWorkoutBtn.classList.remove('hidden');
    localStorage.setItem(WORKOUT_TIMER_KEY, JSON.stringify({ workoutStart, pausedTime, pauseStart }));
    workoutTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - workoutStart - pausedTime;
      workoutTimeDisplay.textContent = formatTime(elapsed);
    }, 1000);
  }
}

function endWorkoutTimer() {
  if (workoutTimer) {
    clearInterval(workoutTimer);
    workoutTimer = null;
  }
  localStorage.removeItem(WORKOUT_TIMER_KEY);
  workoutTimerSection.classList.add('hidden');
  startWorkoutBtn.classList.remove('hidden');
  pauseWorkoutBtn.classList.add('hidden');
  resumeWorkoutBtn.classList.add('hidden');
  endWorkoutBtn.classList.add('hidden');
}

async function finishWorkout() {
  const dur = workoutStart ? Date.now() - workoutStart - pausedTime : 0;
  endWorkoutTimer();
  const completedExercises = workout.exercises.map(ex => ({
    name: ex.name,
    sets: ex.sets.map(s => ({
      weight: s.weight,
      reps: s.reps,
      time: s.time,
      status: s.status || 0
    }))
  })).filter(ex => ex.sets.some(s => s.status > 0));
  await saveHistoryEntry(completedExercises, dur, workout.comment, currentTemplate);
  const exHist = loadExerciseHistory();
  completedExercises.forEach(ex => {
    const completedSets = ex.sets.filter(s => s.status === 2);
    exHist[ex.name] = JSON.parse(JSON.stringify(completedSets));
  });
  saveExerciseHistory(exHist);
  renderExerciseOptions();
  renderExerciseListHome();
  await renderHistory();

  if (currentTemplate) {
    const templates = await loadTemplates();
    const tmpl = templates.find(t => t.name === currentTemplate);
    if (tmpl) {
      const changed = JSON.stringify(tmpl.exercises) !== JSON.stringify(workout.exercises) || (tmpl.comment || '') !== (workout.comment || '');
      if (changed) {
        if (confirm('Update the template with these changes?')) {
          tmpl.exercises = JSON.parse(JSON.stringify(workout.exercises));
          tmpl.comment = workout.comment;
          await saveTemplates(templates);
          await renderTemplateList();
        }
      }
    }
  }
  currentTemplate = null;
  renderCurrentTemplate();
  updateResumeButton();
}

function getLastExerciseSets(name) {
  const hist = loadExerciseHistory();
  return hist[name] || null;
}

function getExerciseAttempts(name) {
  const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  return history
    .filter(w => w.exercises.some(ex => ex.name === name))
    .map(w => ({
      date: w.date,
      sets: w.exercises.find(ex => ex.name === name).sets
    }));
}

function renderWorkout() {
  exerciseList.innerHTML = '';
  renderWorkoutComment();
  workout.exercises.forEach((ex, i) => {
    const div = document.createElement('div');
    div.className = 'exercise';
    div.dataset.index = i;

    const header = document.createElement('div');
    header.className = 'exercise-header';
    const title = document.createElement('h3');
    title.className = 'ex-name';
    title.contentEditable = true;
    title.textContent = ex.name;
    header.appendChild(title);
    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.className = 'up';
    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.className = 'down';
    header.appendChild(upBtn);
    header.appendChild(downBtn);
    const delExBtn = document.createElement('button');
    delExBtn.textContent = '🗑️';
    delExBtn.className = 'del-ex';
    header.appendChild(delExBtn);
    div.appendChild(header);

    const ul = document.createElement('ul');
    const lastSets = getLastExerciseSets(ex.name);
    ex.sets.forEach((set, j) => {
      const li = document.createElement('li');
      li.className = 'set-item';
      li.dataset.index = j;
      let history = '';
      if (lastSets && lastSets[j]) {
        const ls = lastSets[j];
        const parts = [];
        if (ls.weight) parts.push(`${ls.weight}kg`);
        if (ls.reps) parts.push(`${ls.reps} reps`);
        if (ls.time) parts.push(`${ls.time}s`);
        if (parts.length) {
          history = `<span class="history">${parts.join(' ')}</span>`;
        }
      }
      const statusVal = 'status' in set ? set.status : (set.done ? 2 : 0);
      li.innerHTML =
        `<input type="number" class="weight" placeholder="kg" value="${set.weight || ''}">` +
        `<input type="number" class="reps" placeholder="reps" value="${set.reps || ''}">` +
        `<input type="number" class="time" placeholder="sec" value="${set.time || ''}">` +
        history +
        `<button class="start-timer${set.time ? '' : ' hidden'}" data-time="${set.time || ''}" title="Start timer">⏱️</button>` +
        `<input type="range" class="status" min="0" max="2" step="1" value="${statusVal}">` +
        `<span class="status-text">${getStatusText(statusVal)}</span>` +
        `<button class="del-set" title="Delete">🗑️</button>`;
      ul.appendChild(li);
    });
    div.appendChild(ul);
    const addSetBtn = document.createElement('button');
    addSetBtn.className = 'add-set';
    addSetBtn.textContent = 'Add Set';
    div.appendChild(addSetBtn);

    if (ex.comment) {
      const txt = document.createElement('textarea');
      txt.className = 'ex-comment';
      txt.value = ex.comment;
      div.appendChild(txt);
    } else {
      const addComment = document.createElement('button');
      addComment.className = 'add-ex-comment';
      addComment.textContent = 'Add Comment';
      div.appendChild(addComment);
    }

    const last = getLastExerciseSets(ex.name);
    if (last) {
      const hist = document.createElement('div');
      hist.className = 'last-history';
      hist.textContent = 'Last: ' + last.map(s => {
        const parts = [];
        if (s.weight) parts.push(`${s.weight}kg`);
        if (s.reps) parts.push(`${s.reps} reps`);
        if (s.time) parts.push(`${s.time}s`);
        return parts.join(' ');
      }).join(', ');
      div.appendChild(hist);
    }

    exerciseList.appendChild(div);
  });
}

async function renderHistory() {
  const history = await loadHistory();
  historyList.innerHTML = '';
  history.slice().reverse().forEach(w => {
    const div = document.createElement('div');
    div.className = 'history-entry';
    const header = document.createElement('div');
    header.textContent = formatDate(w.date);
    div.appendChild(header);
    if (w.duration) {
      const durDiv = document.createElement('div');
      durDiv.textContent = 'Duration: ' + formatTime(w.duration);
      div.appendChild(durDiv);
    }
    if (w.template) {
      const t = document.createElement('div');
      t.textContent = `Template: ${w.template}`;
      div.appendChild(t);
    }
    if (w.comment) {
      const p = document.createElement('div');
      p.textContent = w.comment;
      div.appendChild(p);
    }
    const ul = document.createElement('ul');
    w.exercises.forEach(ex => {
      const li = document.createElement('li');
      li.innerHTML = `${ex.name}: ` + ex.sets.map(s => {
        const parts = [];
        if (s.weight) parts.push(`${s.weight}kg`);
        if (s.reps) parts.push(`${s.reps} reps`);
        if (s.time) parts.push(`${s.time}s`);
        const status = 'status' in s ? s.status : (s.done ? 2 : 0);
        let mark = '';
        if (status === 2) mark = '<span class="tick">✓</span>';
        else if (status === 1) mark = '<span class="cross">✗</span>';
        return parts.join(' ') + (mark ? ' ' + mark : '');
      }).join(', ');
      ul.appendChild(li);
    });
    div.appendChild(ul);
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'del-history';
    delBtn.dataset.id = w.id;
    div.appendChild(delBtn);
    historyList.appendChild(div);
  });
}

addExerciseForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = exerciseNameInput.value.trim();
  if (!name) return;
  const lastSets = getLastExerciseSets(name);
  const sets = lastSets
    ? lastSets.map(() => ({ weight: '', reps: '', time: '', status: 0 }))
    : [{ weight: '', reps: '', time: '', status: 0 }];
  workout.exercises.push({ name, sets });
  exerciseNameInput.value = '';
  saveWorkout();
  renderWorkout();
  renderExerciseOptions();
});

exerciseList.addEventListener('click', e => {
  const exEl = e.target.closest('.exercise');
  if (!exEl) return;
  const exIndex = parseInt(exEl.dataset.index, 10);
  if (e.target.classList.contains('add-set')) {
    const sets = workout.exercises[exIndex].sets;
    const last = sets[sets.length - 1];
    const weight = last && last.weight !== '' ? last.weight : '';
    const reps = last && last.reps !== '' ? last.reps : '';
    const time = last && last.time !== '' ? last.time : '';
    sets.push({ weight, reps, time, status: 0 });
    saveWorkout();
    renderWorkout();
  } else if (e.target.classList.contains('up') && exIndex > 0) {
    const tmp = workout.exercises[exIndex - 1];
    workout.exercises[exIndex - 1] = workout.exercises[exIndex];
    workout.exercises[exIndex] = tmp;
    saveWorkout();
    renderWorkout();
  } else if (e.target.classList.contains('down') && exIndex < workout.exercises.length - 1) {
    const tmp = workout.exercises[exIndex + 1];
    workout.exercises[exIndex + 1] = workout.exercises[exIndex];
    workout.exercises[exIndex] = tmp;
    saveWorkout();
    renderWorkout();
  } else if (e.target.classList.contains('del-set')) {
    const setEl = e.target.closest('.set-item');
    if (setEl) {
      const setIndex = parseInt(setEl.dataset.index, 10);
      workout.exercises[exIndex].sets.splice(setIndex, 1);
      saveWorkout();
      renderWorkout();
    }
  } else if (e.target.classList.contains('start-timer')) {
    const secs = parseInt(e.target.dataset.time, 10);
    const setEl = e.target.closest('.set-item');
    if (secs && setEl) startSetTimer(setEl, secs);
  } else if (e.target.classList.contains('del-ex')) {
    workout.exercises.splice(exIndex, 1);
    saveWorkout();
    renderWorkout();
  } else if (e.target.classList.contains('add-ex-comment')) {
    e.target.remove();
    const txt = document.createElement('textarea');
    txt.className = 'ex-comment';
    workout.exercises[exIndex].comment = '';
    txt.value = '';
    exEl.appendChild(txt);
    txt.focus();
  } else if (e.target.classList.contains('ex-name')) {
    const existing = exEl.querySelector('.prev-attempts');
    if (existing) {
      existing.remove();
    } else {
      const name = workout.exercises[exIndex].name;
      const attempts = getExerciseAttempts(name).slice().reverse();
      const div = document.createElement('div');
      div.className = 'prev-attempts';
      if (attempts.length === 0) {
        div.textContent = 'No previous attempts';
      } else {
        attempts.forEach(a => {
          const p = document.createElement('div');
          p.textContent = `${formatDate(a.date)}: ` +
            a.sets.map(s => {
              const parts = [];
              if (s.weight) parts.push(`${s.weight}kg`);
              if (s.reps) parts.push(`${s.reps} reps`);
              if (s.time) parts.push(`${s.time}s`);
              return parts.join(' ');
            }).join(', ');
          div.appendChild(p);
        });
      }
      exEl.appendChild(div);
    }
  }
});

exerciseList.addEventListener('input', e => {
  const exEl = e.target.closest('.exercise');
  if (!exEl) return;
  const exIndex = parseInt(exEl.dataset.index, 10);
  if (e.target.classList.contains('ex-name')) {
    workout.exercises[exIndex].name = e.target.textContent.trim();
  }
  const setEl = e.target.closest('.set-item');
  if (setEl) {
    const setIndex = parseInt(setEl.dataset.index, 10);
    const set = workout.exercises[exIndex].sets[setIndex];
    if (e.target.classList.contains('weight')) {
      set.weight = e.target.value;
    } else if (e.target.classList.contains('reps')) {
      set.reps = e.target.value;
    } else if (e.target.classList.contains('time')) {
      set.time = e.target.value;
      const btn = setEl.querySelector('.start-timer');
      if (btn) {
        btn.dataset.time = set.time;
        if (set.time && set.time !== '') btn.classList.remove('hidden');
        else btn.classList.add('hidden');
      }
    } else if (e.target.classList.contains('status')) {
      set.status = parseInt(e.target.value, 10);
      const textEl = setEl.querySelector('.status-text');
      if (textEl) textEl.textContent = getStatusText(set.status);
    }
  } else if (e.target.classList.contains('ex-comment')) {
    workout.exercises[exIndex].comment = e.target.value;
  }
  saveWorkout();
});

exerciseList.addEventListener('blur', e => {
  if (e.target.classList.contains('ex-comment')) {
    const exEl = e.target.closest('.exercise');
    const exIndex = parseInt(exEl.dataset.index, 10);
    if (e.target.value.trim() === '') {
      delete workout.exercises[exIndex].comment;
      renderWorkout();
    }
    saveWorkout();
  }
}, true);

exerciseList.addEventListener('change', e => {
  const exEl = e.target.closest('.exercise');
  if (!exEl) return;
  const exIndex = parseInt(exEl.dataset.index, 10);
  const setEl = e.target.closest('.set-item');
  if (setEl && e.target.classList.contains('status')) {
    const setIndex = parseInt(setEl.dataset.index, 10);
    const val = parseInt(e.target.value, 10);
    workout.exercises[exIndex].sets[setIndex].status = val;
    const textEl = setEl.querySelector('.status-text');
    if (textEl) textEl.textContent = getStatusText(val);
    saveWorkout();
    if (val >= 1) {
      if (!workoutStart) startWorkoutTimer();
      startRestTimer(setEl);
    }
  }
});


saveTemplateBtn.addEventListener('click', async () => {
  const name = prompt('Template name:');
  if (!name) return;
  const templates = await loadTemplates();
  const existing = templates.find(t => t.name === name);
  if (existing) {
    if (!confirm('Overwrite existing template?')) return;
    existing.exercises = JSON.parse(JSON.stringify(workout.exercises));
    existing.comment = workout.comment;
  } else {
    templates.push({ name, exercises: JSON.parse(JSON.stringify(workout.exercises)), comment: workout.comment });
  }
  await saveTemplates(templates);
  await renderTemplateList();
});

startBlankBtn.addEventListener('click', async () => {
  if (!(await confirmEndCurrentWorkout())) return;
  workout = { exercises: [], comment: '' };
  currentTemplate = null;
  renderCurrentTemplate();
  saveWorkout();
  startSection.classList.add('hidden');
  showWorkoutUI(true);
  endWorkoutTimer();
  renderWorkout();
  await renderHistory();
});

homeBtn.addEventListener('click', () => {
  showWorkoutUI(false);
  startSection.classList.remove('hidden');
  clearInterval(restTimer);
  restEndTime = null;
  restTotal = null;
  localStorage.removeItem('restEndTime');
  localStorage.removeItem('restTotal');
  updateResumeButton();
});

if (resumeHomeBtn) {
  resumeHomeBtn.addEventListener('click', () => {
    startSection.classList.add('hidden');
    showWorkoutUI(true);
  });
}

exportBtn.addEventListener('click', exportAllData);
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', e => importDataFromFile(e.target.files[0]));
instructionsBtn.addEventListener('click', () => {
  startSection.classList.add('hidden');
  instructionsSection.classList.remove('hidden');
});
instructionsBack.addEventListener('click', () => {
  instructionsSection.classList.add('hidden');
  startSection.classList.remove('hidden');
});
startWorkoutBtn.addEventListener('click', startWorkoutTimer);
pauseWorkoutBtn.addEventListener('click', pauseWorkoutTimer);
resumeWorkoutBtn.addEventListener('click', resumeWorkoutTimer);
endWorkoutBtn.addEventListener('click', finishWorkout);

historyList.addEventListener('click', async e => {
  if (e.target.classList.contains('del-history')) {
    const id = parseInt(e.target.dataset.id, 10);
    let history = await loadHistory();
    history = history.filter(h => h.id !== id);
    localStorage.setItem('workoutHistory', JSON.stringify(history));
    updateExerciseHistoryFromWorkouts(history);
    renderHistory();
    renderExerciseOptions();
    renderExerciseListHome();
  }
});

if (exerciseListHome) {
  exerciseListHome.addEventListener('click', e => {
    if (e.target.classList.contains('exercise-home-entry')) {
      const name = e.target.dataset.name;
      showExerciseChart(name);
    }
  });
}

if (exerciseChartBack) {
  exerciseChartBack.addEventListener('click', () => {
    exerciseChartSection.classList.add('hidden');
    startSection.classList.remove('hidden');
    if (exerciseChartLegend) exerciseChartLegend.innerHTML = '';
  });
}

if (exerciseSortSelect) {
  exerciseSortSelect.addEventListener('change', () => {
    exerciseSortOrder = exerciseSortSelect.value;
    renderExerciseListHome();
  });
}


if (workoutCommentEl) {
  workoutCommentEl.addEventListener('input', () => {
    workout.comment = workoutCommentEl.value;
    saveWorkout();
  });
  workoutCommentEl.addEventListener('blur', () => {
    if (workoutCommentEl.value.trim() === '') {
      workout.comment = '';
      renderWorkoutComment();
      saveWorkout();
    }
  });
}

templateList.addEventListener('click', async e => {
  if (e.target.classList.contains('del-template')) {
    const idx = parseInt(e.target.dataset.index, 10);
    const templates = await loadTemplates();
    templates.splice(idx, 1);
    await saveTemplates(templates);
    await renderTemplateList();
  } else if (e.target.classList.contains('tmpl-start')) {
    if (!(await confirmEndCurrentWorkout())) return;
    const idx = parseInt(e.target.dataset.index, 10);
    const templates = await loadTemplates();
    const tmpl = templates[idx];
    if (tmpl) {
      workout = JSON.parse(JSON.stringify({ exercises: tmpl.exercises, comment: tmpl.comment || '' }));
      workout.exercises.forEach(ex => ex.sets.forEach(s => {
        s.status = 0;
        delete s.done;
      }));
      currentTemplate = tmpl.name;
      renderCurrentTemplate();
      saveWorkout();
      startSection.classList.add('hidden');
      showWorkoutUI(true);
      endWorkoutTimer();
      renderWorkout();
      await renderHistory();
    }
  }
});

function init() {
  loadWorkout();
  renderExerciseOptions();
  renderExerciseListHome();
  renderHistory();
  renderWorkout();
  renderTemplateList();
  renderCurrentTemplate();
  updateResumeButton();
  const savedRestEnd = parseInt(localStorage.getItem('restEndTime'), 10);
  if (savedRestEnd && savedRestEnd > Date.now()) {
    const savedTotal = parseInt(localStorage.getItem('restTotal'), 10) || Math.ceil((savedRestEnd - Date.now()) / 1000);
    const remaining = Math.ceil((savedRestEnd - Date.now()) / 1000);
    startRestTimer(null, remaining, savedTotal);
  } else {
    localStorage.removeItem('restEndTime');
    localStorage.removeItem('restTotal');
  }
  const wt = JSON.parse(localStorage.getItem(WORKOUT_TIMER_KEY) || 'null');
  if (wt && wt.workoutStart) {
    workoutStart = wt.workoutStart;
    pausedTime = wt.pausedTime || 0;
    pauseStart = wt.pauseStart || null;
    workoutTimerSection.classList.remove('hidden');
    startWorkoutBtn.classList.add('hidden');
    endWorkoutBtn.classList.remove('hidden');
    if (pauseStart) {
      pauseWorkoutBtn.classList.add('hidden');
      resumeWorkoutBtn.classList.remove('hidden');
      const elapsed = pauseStart - workoutStart - pausedTime;
      workoutTimeDisplay.textContent = formatTime(elapsed);
    } else {
      pauseWorkoutBtn.classList.remove('hidden');
      resumeWorkoutBtn.classList.add('hidden');
      workoutTimeDisplay.textContent = formatTime(Date.now() - workoutStart - pausedTime);
      workoutTimer = setInterval(() => {
        const now = Date.now();
        const elapsed = now - workoutStart - pausedTime;
        workoutTimeDisplay.textContent = formatTime(elapsed);
      }, 1000);
    }
  }
  if (workout.exercises && workout.exercises.length > 0) {
    startSection.classList.add('hidden');
    showWorkoutUI(true);
  } else {
    showWorkoutUI(false);
    startSection.classList.remove('hidden');
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      function checkUpdate() {
        reg.update();
      }

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      reg.update();
      setInterval(checkUpdate, 60 * 60 * 1000);
    });
  }
  if ('Notification' in window) {
    Notification.requestPermission();
  }
  if (appVersionFooter) appVersionFooter.textContent = 'Version ' + APP_VERSION;
}

document.addEventListener('DOMContentLoaded', init);
