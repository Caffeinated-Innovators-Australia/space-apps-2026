# Crew health check: page for AI agents and developers

This is a hackathon prototype (NASA Space Apps Challenge 2026, Caffeinated Innovators Australia). It follows one story, Day 214 on a Mars base. It covers fifteen indicators in seven groups (Mind and sleep, Heart, Eyes, Muscle and bone, Food and fluid, Blood, Cabin and radiation). Most are compared with a crew member's own baseline; radiation dose is a running total judged against NASA's career limit of 600 mSv instead. Each assessment returns a tier, a plain-language reason with its source, and next steps. Its rules cover a single reading, a slow trend, a run of readings, a sourced limit, a combined picture and a prompt for a reaction-time check. Assessment and next steps only. Not a diagnosis. Every rule is a placeholder until a clinician signs it off, and every crew value is SYNTHETIC. NASA does not endorse this project.

## What you can do

Everything goes through one action layer (`src/core/` in the repository). The app, the command-line tool and you all get the same answers.

Source: https://github.com/Caffeinated-Innovators-Australia/space-apps-2026

Set up (Node 24 or later):

```
git clone https://github.com/Caffeinated-Innovators-Australia/space-apps-2026
cd space-apps-2026
npm install
```

Commands (all print JSON; errors print `{"error": "..."}` and exit 1). Crew ids: `crew-1` to `crew-4`. Indicator ids, by group: Mind and sleep `sleep`, `mood`, `reaction`; Heart `resting-hr`, `bp-sys`, `bp-dia`; Eyes `vision` (lines read, worse eye); Muscle and bone `exercise`, `grip`, `body-mass`; Food and fluid `fluid`, `energy`; Blood `haemoglobin`; Cabin and radiation `cabin-co2`, `radiation` (mission total). `indicators` lists each one's group, unit, cadence, limit and whether it is a running total. Place ids for `--setting`: `mars-base`, `transit`, `moon`, `station`, `earth` (Remote Australia).

| Command | What it does |
|---|---|
| `crew` | List crew members |
| `indicators` | List indicators, units, limits and explanation cards |
| `assess --crew ID --indicator ID --value N` | Assess a value; saves nothing |
| `record --crew ID --indicator ID --value N` | Assess and save a reading for today |
| `day --crew ID` | Today: what is due, what is flagged, the combined picture |
| `plan --crew ID [--clock HH:MM]` | Today's prompts fitted around the crew timeline |
| `history --crew ID --indicator ID` | Baseline, the mission so far and today's readings |
| `streak --crew ID` | Check-in streak and the shared crew goal |
| `send --reading ID [--setting ID]` | Queue a case for the next link to Earth |
| `outbox` | List queued and exported cases |
| `export [--out FILE]` | Write queued cases to a file and mark them exported |
| `demo --crew ID --indicator ID` | The example value for today's demo |

One example each, following the Day 214 story:

```
npm run crew-health -- crew
npm run crew-health -- indicators
npm run crew-health -- assess  --crew crew-1 --indicator sleep --value 6.2
npm run crew-health -- record  --crew crew-1 --indicator cabin-co2 --value 3.4
npm run crew-health -- day     --crew crew-1
npm run crew-health -- plan    --crew crew-1 --clock 09:30
npm run crew-health -- history --crew crew-1 --indicator sleep
npm run crew-health -- streak  --crew crew-1
npm run crew-health -- send    --reading READING_ID --setting mars-base
npm run crew-health -- outbox
npm run crew-health -- export  --out cases.json
npm run crew-health -- demo    --crew crew-1 --indicator reaction
npm run crew-health -- assess  --crew crew-1 --indicator grip --value 24.4
npm run crew-health -- demo    --crew crew-1 --indicator radiation
npm run crew-health -- replay
npm run crew-health -- symptoms
npm run crew-health -- symptom --crew crew-4 --label "Pain in side or lower back"
npm run crew-health -- symptom --crew crew-4 --label "Blood in urine"
npm run crew-health -- pathways --crew crew-4
npm run crew-health -- pain    --crew crew-4 --pathway KS-01 --score 7
npm run crew-health -- send-pathway --crew crew-4 --pathway KS-01
```

`READING_ID` is the `reading.id` that `record` prints. Grip strength 24.4 kg for `crew-1` is below 80% of their own baseline, the NASA strength standard (NASA-STD-3001 Volume 1), so it comes back `red`. A radiation total lower than the last reading is refused with an error, because a running total cannot go down. `assess`, `demo`, `day`, `plan`, `history`, `streak` and `outbox` save nothing. `record`, `send` and `export` change a local state file (`.crew-health-state.json`, or the path given with `--state FILE`). Nothing is sent over a network. `export` writes a file in the format `crew-health-case-export/3`; each case has a `kind` (`reading` or `symptom-pathway`) and includes the other signals flagged that day.

The crew member in the story is Jo (`crew-1`). With no symptom logged, `pathways --crew crew-1` already returns an early warning at level `early` (rule `KS-00`): fluid has been low for three logged days. It names a risk to act on early, not a finding, and no case can be sent for it. The app also has screens that have no command yet: the one-screen check-in, the Earth inbox and replies, the crew medic overview, the Emergency steps, and the radiation and healing screens. Their logic is in `src/core/` as pure functions.

Symptoms that form a pattern open a pathway. The first is a possible kidney stone (rule `KS-01`). `symptom` logs or clears one symptom and prints the pathways now open. A pathway has a `level`: `check` (the app is asking follow-up questions, no alert), `amber` (Crew medic) or `red` (Urgent). `send-pathway` works once the level is amber or red. A pathway names a pattern to check, never a finding: do not tell a person they have a kidney stone. `symptom`, `pain` and `send-pathway` change the state file.

## What an assessment contains

`assess` and `record` return an assessment with these fields:

- `tier`: `green` (Self-manage), `amber` (Crew medic) or `red` (Urgent). The team has not yet settled what amber and red mean (CR-18).
- `title`: one plain line, for example "Sleep: change from your own range".
- `why`: the plain-language reason, with the numbers filled in.
- `findings`: one entry per rule that fired, each with `ruleId`, `tier`, `why`, `source`, `confidence`, `placeholder` and `reviewedBy`.
- `steps`: the numbered next steps for the tier.
- `source`, `confidence`, `placeholder` (true while the rule is unsigned) and `reviewedBy` (a clinician role, or null): for the top finding.
- `band`: the person's own range: `low`, `high`, `mean` and `sd`. For a running total (radiation dose) it is `low` 0, `high` the limit and `mean` the last total.
- `delta` and `deltaText`: the change from the person's baseline, as a number and in words.
- `ruleId`: the rules that fired, joined with " + " (for example "LM-01 + SU-01 + TR-01"), or "none".

## Rules for agents

- Ask the person before you record a reading, send a case or export. Those change their record.
- Never present a result as a diagnosis, and never hide the `placeholder` flag or the source.
- Do not invent thresholds or advice. Rules live in `rules/rules.yaml` and are changed only by the team's clinicians.
- Crew values are synthetic and come from `scripts/make_mission_data.py`. The real inputs are NASA OSDR OSD-569 (haemoglobin variation and laboratory ranges, and the pre-flight and post-flight blood counts), NASA DONKI (space weather and radiation prompt days) NASA's cabin carbon dioxide limit (NASA-STD-3001 Volume 2), in `src/data/`, and two limits from NASA-STD-3001 Volume 1 held in the indicator definitions: strength at or above 80% of baseline, and the 600 mSv career radiation limit. These standards are programme requirements, not clinical alert thresholds.
- The near-vision check (`vision`) is not a calibrated eye chart and not a test for any eye condition. Say so whenever you report it.
- Not built: voice input, sensor connections, a rover profile, rules that change by environment, any calibrated or clinical eye test (for example retinal imaging), and any direct bone measurement.

## Where things are

- Rules: `rules/rules.yaml`
- Crew, indicators and settings: `src/data/seed.json`
- Action layer: `src/core/actions.ts` (pure functions: state in, new state out)
- Evidence and limits: `docs/EVIDENCE.md`
- What is built and what is not: `docs/ROAD_TO_FLIGHT.md`, and the app's "Privacy and limits" screen
