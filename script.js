const APP_VERSION = '1.2';
const exerciseList = document.getElementById('exercise-list');
const addExerciseForm = document.getElementById('add-exercise-form');
const exerciseNameInput = document.getElementById('exercise-name');
const exerciseOptions = document.getElementById('exercise-options');
const saveTemplateBtn = document.getElementById('save-template');
const historyList = document.getElementById('history-list');
const restInput = document.getElementById('rest-input');
const timerDisplay = document.getElementById('timer-display');
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

let restTimer = null;
let workout = { exercises: [], comment: '' };
let workoutTimer = null;
let workoutStart = null;
let pausedTime = 0;
let pauseStart = null;
let currentTemplate = null;

function renderWorkoutComment() {
  if (!workoutCommentEl) return;
  workoutCommentEl.value = workout.comment || '';
}

function loadWorkout() {
  const data = localStorage.getItem('currentWorkout');
  if (data) {
    workout = JSON.parse(data);
    if (!workout.exercises) workout.exercises = [];
    if (!('comment' in workout)) workout.comment = '';
  }
}

function saveWorkout() {
  localStorage.setItem('currentWorkout', JSON.stringify(workout));
}

function loadHistory() {
  const data = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  data.forEach(h => {
    if (!('duration' in h)) h.duration = 0;
    if (!('comment' in h)) h.comment = '';
  });
  updateExerciseHistoryFromWorkouts(data);
  return data;
}

function saveHistoryEntry(exercises, duration, comment) {
  const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  const w = {
    id: Date.now(),
    date: new Date().toISOString(),
    exercises,
    duration,
    comment
  };
  history.push(w);
  localStorage.setItem('workoutHistory', JSON.stringify(history));
  updateExerciseHistoryFromWorkouts(history);
  return w;
}

function loadTemplates() {
  const t = JSON.parse(localStorage.getItem('workoutTemplates') || '[]');
  t.forEach(tmp => { if (!('comment' in tmp)) tmp.comment = ''; });
  return t;
}

function saveTemplates(tmpl) {
  localStorage.setItem('workoutTemplates', JSON.stringify(tmpl));
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
  a.download = 'workout-data.json';
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
  const day = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const hour = d.getHours();
  let period = 'evening';
  if (hour >= 5 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 14) period = 'lunchtime';
  else if (hour >= 14 && hour < 18) period = 'afternoon';
  return `${day} ${time} (${period})`;
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

function showWorkoutUI(show) {
  [restSection, workoutSection, addExerciseSection, historySection, topButtons, workoutTimerSection].forEach(sec => {
    if (show) sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
}

let currentProgress = null;

function startRestTimer(setEl) {
  let remaining = parseInt(restInput.value, 10);
  clearInterval(restTimer);
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

  const initial = remaining;
  if (progressText) progressText.textContent = `${remaining}s / ${initial}s`;
  restTimer = setInterval(() => {
    remaining--;
    timerDisplay.textContent = remaining;
    if (currentProgress) {
      const inner = currentProgress.firstElementChild;
      inner.style.width = (remaining / initial) * 100 + '%';
      const text = currentProgress.querySelector('.rest-progress-text');
      if (text) text.textContent = `${remaining}s / ${initial}s`;
    }
    if (remaining <= 0) {
      clearInterval(restTimer);
      playBeep();
      sendRestNotification();
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
  }
}

function resumeWorkoutTimer() {
  if (pauseStart) {
    pausedTime += Date.now() - pauseStart;
    pauseStart = null;
    resumeWorkoutBtn.classList.add('hidden');
    pauseWorkoutBtn.classList.remove('hidden');
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
  workoutTimerSection.classList.add('hidden');
  startWorkoutBtn.classList.remove('hidden');
  pauseWorkoutBtn.classList.add('hidden');
  resumeWorkoutBtn.classList.add('hidden');
  endWorkoutBtn.classList.add('hidden');
}

async function finishWorkout() {
  const dur = workoutStart ? Date.now() - workoutStart - pausedTime : 0;
  endWorkoutTimer();
  await saveHistoryEntry(workout.exercises, dur, workout.comment);
  const exHist = loadExerciseHistory();
  workout.exercises.forEach(ex => {
    exHist[ex.name] = JSON.parse(JSON.stringify(ex.sets));
  });
  saveExerciseHistory(exHist);
  renderExerciseOptions();
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
        history = `<span class="history">${ls.weight || 0}kg x ${ls.reps || 0}</span>`;
      }
      li.innerHTML =
        `<input type="number" class="weight" placeholder="kg" value="${set.weight || ''}">` +
        `<input type="number" class="reps" placeholder="reps" value="${set.reps || ''}">` +
        history +
        `<input type="checkbox" class="done" ${set.done ? 'checked' : ''}>` +
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
      hist.textContent = 'Last: ' + last.map(s => `${s.weight || 0}kg x ${s.reps}`).join(', ');
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
    const dur = w.duration ? ` - ${formatTime(w.duration)}` : '';
    header.textContent = formatDate(w.date) + dur;
    div.appendChild(header);
    if (w.comment) {
      const p = document.createElement('div');
      p.textContent = w.comment;
      div.appendChild(p);
    }
    const ul = document.createElement('ul');
    w.exercises.forEach(ex => {
      const li = document.createElement('li');
      li.textContent = `${ex.name}: ` + ex.sets.map(s => `${s.weight || 0}kg x ${s.reps}${s.done ? '✓' : '✗'}`).join(', ');
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
    ? lastSets.map(() => ({ weight: '', reps: '', done: false }))
    : [{ weight: '', reps: '', done: false }];
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
    sets.push({ weight, reps, done: false });
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
            a.sets.map(s => `${s.weight || 0}kg x ${s.reps}`).join(', ');
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
  if (setEl && e.target.classList.contains('done')) {
    const setIndex = parseInt(setEl.dataset.index, 10);
    workout.exercises[exIndex].sets[setIndex].done = e.target.checked;
    saveWorkout();
    if (e.target.checked) startRestTimer(setEl);
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
  workout = { exercises: [], comment: '' };
  currentTemplate = null;
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
  endWorkoutTimer();
  currentTemplate = null;
});

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
  }
});


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
    const idx = parseInt(e.target.dataset.index, 10);
    const templates = await loadTemplates();
    const tmpl = templates[idx];
    if (tmpl) {
      workout = JSON.parse(JSON.stringify({ exercises: tmpl.exercises, comment: tmpl.comment || '' }));
      workout.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; }));
      currentTemplate = tmpl.name;
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
  renderHistory();
  renderWorkout();
  renderTemplateList();
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
