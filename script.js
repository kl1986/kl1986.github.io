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
  return JSON.parse(localStorage.getItem('workoutHistory') || '[]');
}

function saveHistory(hist) {
  localStorage.setItem('workoutHistory', JSON.stringify(hist));
}

function loadTemplates() {
  return JSON.parse(localStorage.getItem('workoutTemplates') || '[]');
}

function saveTemplates(tmpl) {
  localStorage.setItem('workoutTemplates', JSON.stringify(tmpl));
}

function loadExerciseHistory() {
  return JSON.parse(localStorage.getItem('exerciseHistory') || '{}');
}

function saveExerciseHistory(hist) {
  localStorage.setItem('exerciseHistory', JSON.stringify(hist));
}

function renderTemplateList() {
  const templates = loadTemplates();
  templateList.innerHTML = '';
  templates.forEach((t, i) => {
    const wrapper = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = t.name;
    btn.dataset.index = i;
    btn.className = 'tmpl-start';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.dataset.index = i;
    delBtn.className = 'del-template';
    wrapper.appendChild(btn);
    wrapper.appendChild(delBtn);
    templateList.appendChild(wrapper);
  });
}

function renderExerciseOptions() {
  const hist = loadExerciseHistory();
  exerciseOptions.innerHTML = '';
  Object.keys(hist).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    exerciseOptions.appendChild(opt);
  });
}

function showWorkoutUI(show) {
  [restSection, workoutSection, addExerciseSection, historySection].forEach(sec => {
    if (show) sec.classList.remove('hidden');
    else sec.classList.add('hidden');
  });
}

function startRestTimer() {
  let remaining = parseInt(restInput.value, 10);
  clearInterval(restTimer);
  timerDisplay.textContent = remaining;
  restTimer = setInterval(() => {
    remaining--;
    timerDisplay.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(restTimer);
    }
  }, 1000);
}

function getLastExerciseSets(name) {
  const hist = loadExerciseHistory();
  return hist[name] || null;
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
    delExBtn.textContent = 'Delete';
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
        `<button class="del-set">Delete</button>`;
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

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';
  history.slice().reverse().forEach(w => {
    const div = document.createElement('div');
    div.className = 'history-entry';
    const header = document.createElement('div');
    header.textContent = w.date;
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
    if (e.target.checked) startRestTimer();
  }
});

saveWorkoutBtn.addEventListener('click', () => {
  const history = loadHistory();
  history.push({ date: new Date().toLocaleString(), exercises: workout.exercises });
  saveHistory(history);
  const exHist = loadExerciseHistory();
  workout.exercises.forEach(ex => {
    exHist[ex.name] = JSON.parse(JSON.stringify(ex.sets));
  });
  saveExerciseHistory(exHist);
  renderExerciseOptions();
  saveWorkout();
  renderHistory();
});

saveTemplateBtn.addEventListener('click', () => {
  const name = prompt('Template name:');
  if (!name) return;
  const templates = loadTemplates();
  const existing = templates.find(t => t.name === name);
  if (existing) {
    if (!confirm('Overwrite existing template?')) return;
    existing.exercises = JSON.parse(JSON.stringify(workout.exercises));
  } else {
    templates.push({ name, exercises: JSON.parse(JSON.stringify(workout.exercises)) });
  }
  saveTemplates(templates);
  renderTemplateList();
});

startBlankBtn.addEventListener('click', () => {
  workout = { exercises: [] };
  saveWorkout();
  startSection.classList.add('hidden');
  showWorkoutUI(true);
  renderWorkout();
  renderHistory();
});

homeBtn.addEventListener('click', () => {
  showWorkoutUI(false);
  startSection.classList.remove('hidden');
  clearInterval(restTimer);
});

templateList.addEventListener('click', e => {
  if (e.target.classList.contains('del-template')) {
    const idx = parseInt(e.target.dataset.index, 10);
    const templates = loadTemplates();
    templates.splice(idx, 1);
    saveTemplates(templates);
    renderTemplateList();
  } else if (e.target.classList.contains('tmpl-start')) {
    const idx = parseInt(e.target.dataset.index, 10);
    const templates = loadTemplates();
    const tmpl = templates[idx];
    if (tmpl) {
      workout = JSON.parse(JSON.stringify({ exercises: tmpl.exercises }));
      workout.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; }));
      saveWorkout();
      startSection.classList.add('hidden');
      showWorkoutUI(true);
      renderWorkout();
      renderHistory();
    }
  }
});

function init() {
  loadWorkout();
  renderTemplateList();
  renderExerciseOptions();
  showWorkoutUI(false);
  startSection.classList.remove('hidden');
  renderWorkout();
  renderHistory();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
}

document.addEventListener('DOMContentLoaded', init);
