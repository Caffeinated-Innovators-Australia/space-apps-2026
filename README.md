# Caffeinated Innovators Australia: NASA Space Apps Challenge 2026

Challenge: Create Health Monitoring Software for Astronauts on Space Missions. Melbourne, 14 to 15 November 2026.

## What we are building

On the way to Mars, a question to Earth's doctors can take up to 45 minutes to come back. This tool helps an astronaut who is not a medical expert act in that gap.

The demo is one story: Day 87 on a Mars base. Jo's sleep has slid over three weeks, although each night stayed inside their own range. Cabin carbon dioxide has crept up and today reads 3.4 mmHg, above NASA's cabin limit of 3 mmHg. The tool spots the sleep trend, rates the cabin reading Urgent against the NASA limit, asks for a reaction-time check (a tap test in the app, about thirty seconds), explains each signal, shows the three flagged signals together on one card, and escalates with a case pack and a countdown to Earth's earliest reply.

Fifteen indicators in seven groups, by body system:

- Mind and sleep: sleep, mood, reaction time.
- Heart: resting heart rate, blood pressure (upper and lower).
- Eyes: near vision, a self-check built into the app.
- Muscle and bone: exercise plan done, grip strength, body mass.
- Food and fluid: fluid intake, food energy.
- Blood: haemoglobin.
- Cabin and radiation: cabin carbon dioxide, radiation dose.

Six check-ins are daily (sleep, resting heart rate, mood, exercise plan done, fluid intake, food energy). The weekly ones each fall due on their own day of the mission week; near vision is due on Day 87. Reaction time is asked for when the rules call for it. Cabin carbon dioxide and radiation dose come from sensors, SYNTHETIC in the demo.

Most indicators are compared with the person's own baseline. Some also have a sourced limit. Grip strength has a floor of 80% of the person's own baseline, from NASA-STD-3001 Volume 1. Radiation dose is a running total judged against NASA's career limit of 600 mSv, not against a personal range. Every indicator has an explanation card (how to measure, why it matters, what to do, the NASA hazards, sources). Results are sorted into three tiers: Self-manage, Crew medic, Urgent. A prompt scheduler never asks for a check-in during a critical operation such as an EVA (extravehicular activity, a spacewalk). An honest-reporting loop counts check-ins, never results. Five environment profiles (Mars base, In transit, Moon base, Space station, Remote Australia) change the reply delay and guidance. Rules decide; no AI model runs in the app.

Symptoms can form a pattern too. If a crew member logs pain in the side or lower back, the app asks three quick questions. If the answers match the pattern a crew medic checks for a kidney stone, it raises a Crew medic or Urgent result with steps to start now, a pain log and a case for Earth. It names a pattern to check, never a finding. Its symptoms, tiers and steps are placeholders for our clinicians (CR-25 to CR-28).

The app also has a one-screen daily check-in, a three-step "Feeling off?" flow, an early warning before any symptom, a handover in clinical order with an Earth inbox where the remote doctor replies, a crew medic overview that shows only what people have chosen to share, and an Emergency button on every screen. Jo is the crew member in the story. Sam is the station hand in the remote Australia twin.

This is an assessment and next-steps tool. It does not diagnose. It is a hackathon prototype and makes no clinical accuracy claim. The near-vision self-check is not a calibrated eye chart and not a test for any eye condition; the app says so. There is no in-flight way to measure bone directly, so exercise and grip strength stand in for it. Not built: voice input, sensor connections, a rover profile, rules that change by environment, any calibrated or clinical eye test (for example retinal imaging), and any direct bone measurement.

## Status

Live demo: https://caffeinated-innovators-australia.github.io/space-apps-2026/ (no sign-in; works offline once it has loaded).

In development during the hackathon. The rules, their numbers and the explanation card wording are placeholders until our clinicians sign them off. Requirements are in `docs/REQUIREMENTS.md`; the technical spec is in `docs/SPEC.md`.

## How it answers the challenge

Each ask in the challenge statement is mapped to a screen in `docs/CHALLENGE.md`. The environment switcher shows the same case at a Mars base, in transit, on a Moon base, on a space station and in very remote Australia, where potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities (Australian Institute of Health and Welfare, 2022 to 2024).

## Data

- NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real crew data, pre-flight and post-flight. The variation in these crew members' own pre-flight haemoglobin draws sets the width of the haemoglobin band, and its laboratory ranges set the haemoglobin limit.
- NASA DONKI solar energetic particle events (CCMC, NASA Goddard Space Flight Center): https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real events. The latest is shown on the space-weather card, and those inside the mission window are listed in the mission data as radiation prompt days.
- NASA-STD-3001 Volume 2: the cabin carbon dioxide limit of 3 mmHg (one-hour average). It is a habitat design requirement, not a clinical alert threshold.
- NASA-STD-3001 Volume 1: in-mission skeletal muscle strength at or above 80% of baseline (used as the grip strength floor), and the career effective dose limit of 600 mSv from spaceflight (used for radiation dose). These are programme requirements, not clinical alert thresholds. Using them as prompts is the team's choice.
- NASA Human Research Program hazards and risks pages (linked as sources on every explanation card, beside its hazard chips): https://www.nasa.gov/hrp/hazards/ and https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp and https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Every synthetic value in the app is labelled SYNTHETIC. The four crew, their baselines, 86 mission days and the radiation dosimeter totals are made by `scripts/make_mission_data.py` with a fixed seed.
- NASA does not endorse this project. No NASA logos are used.
- Full list: `REFERENCES.md` and `docs/DATA_DICTIONARY.md`.

## How it is built

There is no server. Everything runs on the device, so it keeps working with no link to Earth. Readings, logs and cases are saved in the browser's own database (IndexedDB). One action layer (`src/core/`) serves the screens, a command-line tool and AI agents. What is built, what is placeholder and what real use would need is set out in `docs/ROAD_TO_FLIGHT.md` and on the app's "Privacy and limits" screen. Teammates adding a module: see `docs/MODULE_GUIDE.md`. AI agents: see `public/agents.md`.

## Design

The screens follow NASA's published criteria for crew displays: colour for meaning only, text contrast of 7:1 or better, an always-visible bar for mission time and alerts, and a second cue beside every colour. Each criterion, its source and how it is met is in `docs/DESIGN_CRITERIA.md`. No NASA logo or branding is used.

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
