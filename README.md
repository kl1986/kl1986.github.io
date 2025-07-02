# Workout App

This offline-capable web application helps you build and repeat workouts directly on your phone. You can:

- Add any number of exercises
- For each exercise manage multiple sets with weight and reps
- When adding a new set it inherits the previous set's weight and reps
- Reorder exercises and edit set details as you train
- Tick off sets to automatically start a rest countdown
- Delete individual sets, entire exercises or saved templates
- Save the workout and view previous sessions in the history list
- Select exercises you've done before when adding a new one, with the same number of sets as last time

The project now includes a small Node.js server that stores user accounts, the global exercise list, workout history and saved templates. Run it with:

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser. Register or log in to have your workouts and templates synced to the server. When adding a new exercise it is saved to the shared database, but the sets, reps and weights remain unique to your account.

The app still works offline thanks to local storage and a service worker.
