const exerciseList = document.getElementById('exercise-list');
const addExerciseForm = document.getElementById('add-exercise-form');
const exerciseNameInput = document.getElementById('exercise-name');
const exerciseOptions = document.getElementById('exercise-options');
const saveWorkoutBtn = document.getElementById('save-workout');
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

let restTimer = null;
let workout = { exercises: [] };

function loadWorkout() {
  const data = localStorage.getItem('currentWorkout');
  if (data) {
    workout = JSON.parse(data);
  }
}

function saveWorkout() {
  localStorage.setItem('currentWorkout', JSON.stringify(workout));
}

function loadHistory() {
  const data = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  updateExerciseHistoryFromWorkouts(data);
  return data;
}

function saveHistoryEntry(exercises) {
  const history = JSON.parse(localStorage.getItem('workoutHistory') || '[]');
  const w = { id: Date.now(), date: new Date().toISOString(), exercises };
  history.push(w);
  localStorage.setItem('workoutHistory', JSON.stringify(history));
  updateExerciseHistoryFromWorkouts(history);
  return w;
}

function loadTemplates() {
  return JSON.parse(localStorage.getItem('workoutTemplates') || '[]');
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
  location.href = 'mailto:?subject=Workout%20Data&body=' + encodeURIComponent(JSON.stringify(data));
}

function importDataFromFile(file) {
  if (!file) return;
  file.text().then(str => {
    try {
      const data = JSON.parse(str);
      if (data.currentWorkout) {
        workout = data.currentWorkout;
        saveWorkout();
      }
      if (data.workoutHistory) {
        localStorage.setItem('workoutHistory', JSON.stringify(data.workoutHistory));
      }
      if (data.workoutTemplates) {
        localStorage.setItem('workoutTemplates', JSON.stringify(data.workoutTemplates));
      }
      if (data.exerciseHistory) {
        saveExerciseHistory(data.exerciseHistory);
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
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
  [restSection, workoutSection, addExerciseSection, historySection, topButtons].forEach(sec => {
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
    header.textContent = formatDate(w.date);
    div.appendChild(header);
    const ul = document.createElement('ul');
    w.exercises.forEach(ex => {
      const li = document.createElement('li');
      li.textContent = `${ex.name}: ` + ex.sets.map(s => `${s.weight || 0}kg x ${s.reps}`).join(', ');
      ul.appendChild(li);
    });
    div.appendChild(ul);
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
  }
  saveWorkout();
});

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

saveWorkoutBtn.addEventListener('click', async () => {
  await saveHistoryEntry(workout.exercises);
  const exHist = loadExerciseHistory();
  workout.exercises.forEach(ex => {
    exHist[ex.name] = JSON.parse(JSON.stringify(ex.sets));
  });
  saveExerciseHistory(exHist);
  renderExerciseOptions();
  saveWorkout();
  await renderHistory();
});

saveTemplateBtn.addEventListener('click', async () => {
  const name = prompt('Template name:');
  if (!name) return;
  const templates = await loadTemplates();
  const existing = templates.find(t => t.name === name);
  if (existing) {
    if (!confirm('Overwrite existing template?')) return;
    existing.exercises = JSON.parse(JSON.stringify(workout.exercises));
  } else {
    templates.push({ name, exercises: JSON.parse(JSON.stringify(workout.exercises)) });
  }
  await saveTemplates(templates);
  await renderTemplateList();
});

startBlankBtn.addEventListener('click', async () => {
  workout = { exercises: [] };
  saveWorkout();
  startSection.classList.add('hidden');
  showWorkoutUI(true);
  renderWorkout();
  await renderHistory();
});

homeBtn.addEventListener('click', () => {
  showWorkoutUI(false);
  startSection.classList.remove('hidden');
  clearInterval(restTimer);
});

exportBtn.addEventListener('click', exportAllData);
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', e => importDataFromFile(e.target.files[0]));

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
      workout = JSON.parse(JSON.stringify({ exercises: tmpl.exercises }));
      workout.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; }));
      saveWorkout();
      startSection.classList.add('hidden');
      showWorkoutUI(true);
      renderWorkout();
      await renderHistory();
    }
  }
});

function init() {
  showWorkoutUI(false);
  startSection.classList.remove('hidden');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
  if ('Notification' in window) {
    Notification.requestPermission();
  }
  loadWorkout();
  renderExerciseOptions();
  renderHistory();
  renderWorkout();
  renderTemplateList();
}

document.addEventListener('DOMContentLoaded', init);
