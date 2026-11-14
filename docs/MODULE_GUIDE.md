# Guide for teammates adding a module

There is no server. The app is a static web app in TypeScript (React, Vite) that runs entirely in the browser and keeps its data on the device. Your module should do the same, or the offline demo breaks.

## The action layer you call

Everything that reads or changes the record goes through `src/core/`. Import from `src/core/index.ts`. The functions are pure: you pass the current state in and get a new state back; nothing is changed in place. Where a function cannot answer (an unknown person, an unknown indicator, an impossible reading, an unsafe rules file) it throws an error with a plain-language message.

### `src/core/rules.ts`: the rules engine

| Function | Arguments (as written in code) | What it does |
|---|---|---|
| `parseRules` | `text` | Reads the text of `rules/rules.yaml` and checks it. Throws if a rule has no source, sign-off field or confidence label, or if a tier has no next steps |
| `round` | `n, dp = 1` | Rounds a number to `dp` decimal places |
| `personalBand` | `baseline, k, fixedSd?` | The person's own band: baseline mean plus or minus `k` standard deviations (a fixed standard deviation from real crew data if given) |
| `side` | `value, band, watch = 'both'` | Whether a value is below or above the band, counting only the side that matters |
| `tierFor` | `value, band, refMin?, refMax?, watch = 'both'` | The tier of one value, for chart points: green inside the band, amber outside it, red outside it and beyond the given lower or upper limit |
| `assess` | `file, input` | Runs every rule on one value against its baseline and history. Returns an `Assessment` |

Also exported: the types `Tier`, `RuleKind`, `RuleDef`, `CombinedRule`, `PromptRule`, `RuleFile`, `Band`, `Finding`, `Assessment`, `AssessInput`, and the constants `TIERS` and `RANK`.

### `src/core/actions.ts`: the action layer

| Function | Arguments (as written in code) | What it does |
|---|---|---|
| `initialState` | `seed` | An empty record for a new device |
| `crewById` | `seed, id` | One crew member. Throws on an unknown id |
| `indicatorById` | `seed, id` | One indicator. Throws on an unknown id |
| `settingById` | `seed, id` | One environment profile, or the first one if the id is unknown |
| `recorded` | `state, crewId, indicatorId` | Readings saved on this device for one person and one indicator, oldest first |
| `latestReading` | `state, crewId, indicatorId` | The most recent saved reading |
| `plausible` | `ind, value` | Whether a value is inside the indicator's possible range |
| `limitsFor` | `seed, crewId, indicatorId` | The sourced limits for one person and one indicator: `low`, `high`, `label` and `source`. A fixed limit from the indicator, a floor of `lowFraction` times the person's own baseline mean (grip strength: 80%), or the laboratory range for their sex (haemoglobin) |
| `assessValue` | `seed, rules, crewId, indicatorId, value, earlier = []` | Assesses one value against the person's baseline and mission so far, and any sourced limit. A running total (`mode: 'cumulative'`, radiation dose) is judged against its limit instead, and a total lower than the last reading throws. Saves nothing |
| `assessReading` | `state, seed, rules, reading` | Assesses a saved reading as it stood when it was taken |
| `recordReading` | `state, seed, rules, args: { crewId, indicatorId, value, at }` | Saves a reading. Returns the new state, the reading and its assessment |
| `history` | `state, seed, crewId, indicatorId` | Baseline, the mission so far (one entry per day, null where nothing was logged) and readings saved today |
| `confirmation` | `state, reading` | Whether a raised result is backed by an earlier raised reading today |
| `daySummary` | `state, seed, rules, crewId` | One person's day: what is due (daily and sensor check-ins every day; a weekly one when the mission day modulo 7 equals its `weekDay`), what is flagged, the combined card (CM-01) and any prompt (PR-01) |
| `dayPlan` | `state, seed, rules, crewId` | Today's check-ins fitted around the crew timeline, with the slip applied when it is switched on |
| `streak` | `state, seed, crewId` | Days in a row with every daily check-in logged (the six indicators with `cadence: 'daily'`) |
| `crewGoal` | `state, seed` | The whole crew's daily check-ins over the past seven days: done and total |
| `insights` | `streakDays` | The insights unlocked at 14 and 30 days of streak |
| `toggleStep` | `state, readingId, step` | Ticks or unticks a "meanwhile" step |
| `toggleSymptom` | `state, crewId, label, at` | Logs or removes a one-tap symptom |
| `reportNothing` | `state, crewId` | Logs "Nothing to report" as a check-in |
| `sendCase` | `state, args: { readingId, settingId, at }` | Queues one case per reading for the next link. Sending again returns the same case |
| `casePackContent` | `state, seed, rules, packId` | The full content of one case, including the other signals flagged that day |
| `pathwayStatuses` | `state, seed, rules, crewId` | The symptom patterns open for one person: level (`check`, `amber` or `red`), title, why, steps, recent trends and pain scores |
| `logPain` | `state, args: { crewId, pathwayId, score, at }` | Logs a pain score from 0 to 10. No threshold is applied |
| `togglePathwayStep` | `state, key, step` | Ticks or unticks a pathway step |
| `sendPathwayCase` | `state, seed, rules, args: { crewId, pathwayId, settingId, at }` | Queues one case per person and pathway, once the pattern is amber or red |
| `pathwayCaseContent` | `state, seed, rules, packId` | The full content of a pathway case, built when read |
| `caseContent` | `state, seed, rules, packId` | The content of any case, with `kind` set to `reading` or `symptom-pathway` |
| `exportOutbox` | `state, seed, rules, at` | The file of queued cases (format `crew-health-case-export/3`), and marks them exported |
| `demoValue` | `seed, crewId, indicatorId` | The example value for today's demo, or the person's own baseline average; for a running total, the last mission total plus 0.7 |

Also exported: the types `DayItem` and `DaySummary`.

### `src/core/schedule.ts`: the prompt scheduler

| Function | Arguments (as written in code) | What it does |
|---|---|---|
| `toMin` | `t` | "HH:MM" to minutes after midnight |
| `fromMin` | `m` | Minutes after midnight to "HH:MM" |
| `applySlip` | `timeline, slipMinutes` | Makes the first critical operation end later, and moves every later block with it |
| `plan` | `timeline, checkIns, clock, done` | Fits each check-in to the day. A check-in due during a critical operation is held until five minutes after it ends |

Also exported: the types `CheckIn` and `PlanItem`.

Data shapes (`Seed`, `State`, `Reading`, `CasePack`, `Indicator`, `CrewProfile`, `Setting`, `TimelineBlock`, `Symptom`, `Store`) are in `src/core/types.ts`. The browser store (`src/store/indexeddb.ts`) keeps the `State` in IndexedDB, behind the `Store` interface.

## Where to put things

- A new indicator: add it in `scripts/make_mission_data.py` (id, group, name, unit, valid range, input kind, which direction matters, cadence, `weekDay` if weekly, `mode: 'cumulative'` if it is a running total, any sourced limit, explanation card, an optional `cardNote` saying what the check is not, and a baseline and mission series for each crew member). A new group must also be added to `GROUP_ORDER` in the same script; it shows in the list at once, but a body figure area is added by hand in `src/components/BodyFigure.tsx`. A new input kind (as the near-vision check was) needs its own component on the reading screen. Then run `python3 scripts/make_mission_data.py` to regenerate `src/data/seed.json`. Do not edit `seed.json` by hand. A clinician must supply the range and wording.
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
