const exerciseList = document.getElementById('exercise-list');
const addExerciseForm = document.getElementById('add-exercise-form');
const exerciseNameInput = document.getElementById('exercise-name');
const saveWorkoutBtn = document.getElementById('save-workout');
const historyList = document.getElementById('history-list');
const restInput = document.getElementById('rest-input');
const timerDisplay = document.getElementById('timer-display');

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
  const history = loadHistory().slice().reverse();
  for (const w of history) {
    const ex = w.exercises.find(e => e.name === name);
    if (ex) return ex.sets;
  }
  return null;
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
    div.appendChild(header);

    const ul = document.createElement('ul');
    ex.sets.forEach((set, j) => {
      const li = document.createElement('li');
      li.className = 'set-item';
      li.dataset.index = j;
      li.innerHTML =
        `<input type="number" class="weight" placeholder="kg" value="${set.weight || ''}">` +
        `<input type="number" class="reps" placeholder="reps" value="${set.reps || ''}">` +
        `<input type="checkbox" class="done" ${set.done ? 'checked' : ''}>`;
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
  workout.exercises.push({ name, sets: [{ weight: '', reps: '', done: false }] });
  exerciseNameInput.value = '';
  saveWorkout();
  renderWorkout();
});

exerciseList.addEventListener('click', e => {
  const exEl = e.target.closest('.exercise');
  if (!exEl) return;
  const exIndex = parseInt(exEl.dataset.index, 10);
  if (e.target.classList.contains('add-set')) {
    workout.exercises[exIndex].sets.push({ weight: '', reps: '', done: false });
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
  saveWorkout();
  renderHistory();
});

function init() {
  loadWorkout();
  renderWorkout();
  renderHistory();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
}

document.addEventListener('DOMContentLoaded', init);
