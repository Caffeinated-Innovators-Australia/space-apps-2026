# Caffeinated Innovators Australia: NASA Space Apps Challenge 2026

Challenge: Create Health Monitoring Software for Astronauts on Space Missions. Melbourne, 14 to 15 November 2026.

## What we are building

A delay-aware health decision-support tool for astronauts who are not medical experts. A reading is taken, compared with the astronaut's own pre-flight baseline, explained in plain words with its source, and followed by a clear action and a countdown to the earliest reply from Earth. Results are sorted into three tiers: Self-manage, Crew medic, Urgent. Rules decide; AI only explains.

This is an assessment and next-steps tool. It does not diagnose. It is a hackathon prototype and makes no clinical accuracy claim.

## Status

In development during the hackathon. Requirements are in `docs/REQUIREMENTS.md`; the technical spec is in `docs/SPEC.md`.

## Data

- NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real crew data, pre-flight and post-flight.
- NASA Human Research Program hazards and risks pages: https://www.nasa.gov/hrp/hazards/ and https://www.nasa.gov/hrp/risks/
- Every synthetic value in the app is labelled SYNTHETIC.
- Full list: `REFERENCES.md` and `docs/DATA_DICTIONARY.md`.

## Use of AI

We used AI tools (Claude Code) to help write code and documents. The idea is the team's own. Every use is logged in `AI_USE.md`.

## Clinical content

Every threshold shows its source. Clinicians on the team write and sign off each one; open items are in `CLINICIAN_REVIEW.md`.

## Run it

Run instructions will be added with the initial app commit. Checks:

```
python3 .claude/skills/judge-evals/scripts/run_evals.py auto --repo . --out evals/runs/quick
```

## Licence

Apache License 2.0. See `LICENSE`.
