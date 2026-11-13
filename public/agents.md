# Crew health check: page for AI agents and developers

This is a hackathon prototype (NASA Space Apps Challenge 2026, Caffeinated Innovators Australia). It compares a health reading with a crew member's own baseline and returns a tier, a plain-language reason with its source, and next steps. Assessment and next steps only. Not a diagnosis. Every tiering rule is a placeholder until a clinician signs it off, and every crew value is SYNTHETIC.

## What you can do

Everything goes through one action layer (`src/core/` in the repository). The app, the command-line tool and you all get the same answers.

Source: https://github.com/Caffeinated-Innovators-Australia/space-apps-2026

Set up (Node 24 or later):

```
git clone https://github.com/Caffeinated-Innovators-Australia/space-apps-2026
cd space-apps-2026
npm install
```

Commands (all print JSON; errors print `{"error": "..."}` and exit 1):

```
npm run crew-health -- crew
npm run crew-health -- indicators
npm run crew-health -- assess  --crew crew-2 --indicator haemoglobin --value 13.4
npm run crew-health -- record  --crew crew-2 --indicator haemoglobin --value 13.4
npm run crew-health -- history --crew crew-2 --indicator haemoglobin
npm run crew-health -- send    --reading READING_ID --setting mars-far
npm run crew-health -- outbox
npm run crew-health -- export  --out cases.json
```

`assess` saves nothing. `record`, `send` and `export` change a local state file (`.crew-health-state.json`, or the path given with `--state`). Nothing is sent over a network.

## What an assessment contains

`tier` (`green` = Self-manage, `amber` = Crew medic, `red` = Urgent), `title`, `why`, `steps`, `source`, `confidence`, `placeholder` (true while the rule is unsigned), `reviewedBy`, `band` (the person's own range), `deltaText`, `ruleId`.

## Rules for agents

- Ask the person before you record a reading, send a case or export. Those change their record.
- Never present a result as a diagnosis, and never hide the `placeholder` flag or the source.
- Do not invent thresholds or advice. Rules live in `rules/rules.yaml` and are changed only by the team's clinicians.
- Crew values are synthetic. The real data is NASA OSDR OSD-569 (pre-flight and post-flight blood counts) and NASA DONKI (space weather), in `src/data/`.

## Where things are

- Rules: `rules/rules.yaml`
- Crew, indicators and settings: `src/data/seed.json`
- Action layer: `src/core/actions.ts` (pure functions: state in, new state out)
- Evidence and limits: `docs/EVIDENCE.md`
- What is built and what is not: `docs/ROAD_TO_FLIGHT.md`
