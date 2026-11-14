# Caffeinated Innovators Australia: NASA Space Apps Challenge 2026

Challenge: Create Health Monitoring Software for Astronauts on Space Missions. Melbourne, 14 to 15 November 2026.

## What we are building

On the way to Mars, a question to Earth's doctors can take up to 45 minutes to come back. This tool helps an astronaut who is not a medical expert act in that gap.

The demo is one story: Day 87 on a Mars base. Crew member 1's sleep has slid over three weeks, although each night stayed inside their own range. Cabin carbon dioxide has crept up and today reads 3.4 mmHg, above NASA's cabin limit of 3 mmHg. The tool spots the sleep trend, rates the cabin reading Urgent against the NASA limit, asks for a reaction-time check (a tap test in the app, about thirty seconds), explains each signal, shows the three flagged signals together on one card, and escalates with a case pack and a countdown to Earth's earliest reply.

Six indicators: Sleep, Resting heart rate, Mood, Reaction time, Cabin carbon dioxide and Haemoglobin. Each is compared with the person's own baseline and has an explanation card (how to measure, why it matters, what to do, the NASA hazards, sources). Results are sorted into three tiers: Self-manage, Crew medic, Urgent. A prompt scheduler never asks for a check-in during a critical operation such as an EVA (extravehicular activity, a spacewalk). An honest-reporting loop counts check-ins, never results. Five environment profiles (Mars base, In transit, Moon base, Space station, Remote Australia) change the reply delay and guidance. Rules decide; no AI model runs in the app.

This is an assessment and next-steps tool. It does not diagnose. It is a hackathon prototype and makes no clinical accuracy claim. Not built: voice input, sensor connections, a rover profile, the vision self-check, and rules that change by environment.

## Status

Live demo: https://caffeinated-innovators-australia.github.io/space-apps-2026/ (no sign-in; works offline once it has loaded).

In development during the hackathon. The rules, their numbers and the explanation card wording are placeholders until our clinicians sign them off. Requirements are in `docs/REQUIREMENTS.md`; the technical spec is in `docs/SPEC.md`.

## How it answers the challenge

Each ask in the challenge statement is mapped to a screen in `docs/CHALLENGE.md`. The environment switcher shows the same case at a Mars base, in transit, on a Moon base, on a space station and in very remote Australia, where potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities (Australian Institute of Health and Welfare, 2022 to 2024).

## Data

- NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real crew data, pre-flight and post-flight. The variation in these crew members' own pre-flight haemoglobin draws sets the width of the haemoglobin band, and its laboratory ranges set the haemoglobin limit.
- NASA DONKI solar energetic particle events (CCMC, NASA Goddard Space Flight Center): https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real events. The latest is shown on the space-weather card, and those inside the mission window are listed in the mission data as radiation prompt days.
- NASA-STD-3001 Volume 2: the cabin carbon dioxide limit of 3 mmHg (one-hour average). It is a habitat design requirement, not a clinical alert threshold.
- NASA Human Research Program hazards and risks pages (linked as sources on every explanation card, beside its hazard chips): https://www.nasa.gov/hrp/hazards/ and https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp and https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Every synthetic value in the app is labelled SYNTHETIC. The four crew, their baselines and 86 mission days are made by `scripts/make_mission_data.py` with a fixed seed.
- NASA does not endorse this project. No NASA logos are used.
- Full list: `REFERENCES.md` and `docs/DATA_DICTIONARY.md`.

## How it is built

There is no server. Everything runs on the device, so it keeps working with no link to Earth. Readings, logs and cases are saved in the browser's own database (IndexedDB). One action layer (`src/core/`) serves the screens, a command-line tool and AI agents. What is built, what is placeholder and what real use would need is set out in `docs/ROAD_TO_FLIGHT.md` and on the app's "Privacy and limits" screen. Teammates adding a module: see `docs/MODULE_GUIDE.md`. AI agents: see `public/agents.md`.

## Use of AI

We used AI tools (Claude Code) to help write code and documents. The idea is the team's own. Every use is logged in `AI_USE.md`.

## Clinical content

Every rule shows its source. Each rule, rule number and explanation card is to be written and signed off by a clinician on the team. Until that happens the rule is a marked placeholder, on screen and in `CLINICIAN_REVIEW.md`. Sources, evidence grades and limits are in `docs/EVIDENCE.md`.

## Run it

Needs Node 24 or later.

```
npm install
npm run dev      # local development
npm test         # rules engine and action layer tests
npm run crew-health -- assess --crew crew-1 --indicator sleep --value 6.2   # same rules, from the command line
npm run build    # production build in dist/
python3 scripts/fetch_osd569.py   # refresh the bundled NASA data (optional)
python3 scripts/make_mission_data.py   # regenerate the SYNTHETIC mission data (optional)
python3 .claude/skills/judge-evals/scripts/run_evals.py auto --repo . --out evals/runs/quick
```

## Licence

Apache License 2.0. See `LICENSE`.
