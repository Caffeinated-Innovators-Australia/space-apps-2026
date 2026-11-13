# Caffeinated Innovators Australia: NASA Space Apps Challenge 2026

Challenge: Create Health Monitoring Software for Astronauts on Space Missions. Melbourne, 14 to 15 November 2026.

## What we are building

On the way to Mars, a question to Earth's doctors can take up to 45 minutes to come back. This tool helps an astronaut who is not a medical expert act in that gap. A reading is taken, compared with the astronaut's own pre-flight baseline, explained in plain words with its source, and followed by a clear action and a countdown to the earliest reply from Earth. Results are sorted into three tiers: Self-manage, Crew medic, Urgent. Rules decide; AI only explains.

This is an assessment and next-steps tool. It does not diagnose. It is a hackathon prototype and makes no clinical accuracy claim.

## Status

Live demo: https://caffeinated-innovators-australia.github.io/space-apps-2026/ (no sign-in; works offline once it has loaded).

In development during the hackathon. The tiering rule and its wording are placeholders until our clinicians sign them off. Requirements are in `docs/REQUIREMENTS.md`; the technical spec is in `docs/SPEC.md`.

## How it answers the challenge

Each ask in the challenge statement is mapped to a screen in `docs/CHALLENGE.md`. The "Where are you?" selector shows the same reading at the Moon, at Mars and in very remote Australia, where potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities (Australian Institute of Health and Welfare, 2022 to 2024).

## Data

- NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real crew data, pre-flight and post-flight.
- NASA DONKI solar energetic particle events (CCMC, NASA Goddard Space Flight Center): https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real events, shown with the radiation prompt.
- NASA Human Research Program hazards and risks pages: https://www.nasa.gov/hrp/hazards/ and https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp and https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Every synthetic value in the app is labelled SYNTHETIC.
- Full list: `REFERENCES.md` and `docs/DATA_DICTIONARY.md`.

## Use of AI

We used AI tools (Claude Code) to help write code and documents. The idea is the team's own. Every use is logged in `AI_USE.md`.

## Clinical content

Every threshold shows its source. Each one is to be written and signed off by a clinician on the team. Until that happens the rule is a marked placeholder, on screen and in `CLINICIAN_REVIEW.md`. Sources, evidence grades and limits are in `docs/EVIDENCE.md`.

## Run it

Needs Node 22 or later (built with Node 24).

```
npm install
npm run dev      # local development
npm test         # rules engine tests
npm run build    # production build in dist/
python3 scripts/fetch_osd569.py   # refresh the bundled NASA data (optional)
python3 .claude/skills/judge-evals/scripts/run_evals.py auto --repo . --out evals/runs/quick
```

## Licence

Apache License 2.0. See `LICENSE`.
