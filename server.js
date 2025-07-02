import express from 'express';
import session from 'express-session';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new Low(new JSONFile('db.json'), { users: [], exercises: [], workouts: [] });
await db.read();

app.use(express.json());
app.use(session({
  secret: 'workout-secret',
  resave: false,
  saveUninitialized: false
}));

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (db.data.users.find(u => u.username === username)) return res.status(400).json({ error: 'User exists' });
  const id = nanoid();
  db.data.users.push({ id, username, password });
  await db.write();
  req.session.userId = id;
  res.json({ id, username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.data.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/user', requireLogin, (req, res) => {
  const user = db.data.users.find(u => u.id === req.session.userId);
  res.json({ id: user.id, username: user.username });
});

app.get('/api/exercises', (req, res) => {
  res.json(db.data.exercises);
});

app.post('/api/exercises', requireLogin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  if (!db.data.exercises.includes(name)) {
    db.data.exercises.push(name);
    await db.write();
  }
  res.json({ ok: true });
});

app.get('/api/workouts', requireLogin, (req, res) => {
  const workouts = db.data.workouts.filter(w => w.userId === req.session.userId);
  res.json(workouts);
});

app.post('/api/workouts', requireLogin, async (req, res) => {
  const workout = { id: nanoid(), userId: req.session.userId, date: new Date().toISOString(), exercises: req.body.exercises || [] };
  db.data.workouts.push(workout);
  await db.write();
  res.json(workout);
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
