# Guide for teammates adding a module

There is no server. The app is a static web app in TypeScript (React, Vite) that runs entirely in the browser and keeps its data on the device. Your module should do the same, or the offline demo breaks.

## The action layer you call

Everything that reads or changes the record goes through `src/core/`. Import from `src/core/index.ts`. Every function is pure: you pass the current state in and get a new state back; you never change it in place.

| Function | What it does |
|---|---|
| `parseRules(text)` | Reads `rules/rules.yaml`. Refuses a rule with no source or sign-off field |
| `initialState(seed)` | An empty record for a new device |
| `assessValue(seed, rule, crewId, indicatorId, value)` | Tier, why line, steps, source and personal band for one value. Saves nothing |
| `recordReading(state, seed, rule, { crewId, indicatorId, value, at })` | Saves a reading; returns the new state, the reading and its assessment |
| `latestReading(state, crewId, indicatorId)` | The most recent saved reading |
| `history(state, seed, crewId, indicatorId)` | Baseline, earlier mission values and saved readings |
| `toggleStep(state, readingId, step)` | Ticks or unticks a "meanwhile" step |
| `toggleSymptom(state, crewId, label, at)` | Logs or removes a one-tap symptom |
| `sendCase(state, { readingId, settingId, at })` | Queues one case per reading for the next link |
| `casePackContent(state, seed, rule, packId)` | The full content of one case |
| `exportOutbox(state, seed, rule, at)` | The file of queued cases, and marks them exported |

Data shapes (`Seed`, `State`, `Reading`, `CasePack`, `Indicator`, `CrewProfile`) are in `src/core/types.ts`.

## Where to put things

- A new indicator: add it to `src/data/seed.json` (id, name, region, unit, reference range and its source, a baseline for each crew member). No code change is needed. A clinician must supply the range and wording.
- A new rule: `rules/rules.yaml`, with a `source` and a `signed_off_by` field.
- A new screen: a file in `src/screens/`, added to the route list in `src/App.tsx`.
- New data from NASA or another agency: fetch it once with a script in `scripts/`, save JSON in `src/data/`, and add it to `REFERENCES.md` and `docs/DATA_DICTIONARY.md`.

## House rules

- Work on a branch and open a pull request. Do not push to `main`.
- Run `npm test` and `npm run build` before you push.
- No network calls while the app runs. No secrets in the repository.
- Every synthetic value is labelled SYNTHETIC. Every threshold shows its source. No diagnosis wording.
- Log any new library, dataset or asset in `REFERENCES.md`, and any AI use in `AI_USE.md`.
- If you need a server, Python at run time or a paid service, talk to the build lead first.
