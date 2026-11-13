---
name: judge-evals
description: Continuously scores our build the way Space Apps judges will. It runs automated rule and hygiene gates, a parallel panel of judge personas scoring each criterion against anchored rubrics, and a scorecard with ranked fixes and a trend across checkpoints. Use it after every merged feature (quick mode), at every checkpoint and Flight Readiness Review (full panel), and before submission.
---

# judge-evals

Files:
- `evals/rubric.yaml`: criteria, anchors, gates, judge personas, weight profiles (local vs global round)
- `evals/WINNING_TRAITS.md`: what past winners did that judges rewarded (inputs for the judges)
- `evals/COMPETITOR_ARCHETYPES.md`: what the 2026 field is building (creativity and impact judges read it)
- `.claude/skills/judge-evals/scripts/run_evals.py`: the harness (`auto`, `prompts`, `score`, `all`)
- `evals/runs/<tag>/`: one folder per run; `evals/runs/history.jsonl` holds the trend

**Rubric freshness.** On 13 Nov (official 2026 Judging & Awards Guide release), the Mission lead
updates `rubric.yaml`: criterion names and wording, any weights, `auto_config.submission` limits, and
`auto_config.kickoff_utc`. Bump `meta.version` and log it with flight-recorder.

## Dependencies
Uses existing bench pieces: `judge-simulator` and `validity-sceptic` agents (judges), `flight-recorder` (logging),
`rules-checker` (writes docs/RULES.md), and `data-intake` (writes docs/DATA_DICTIONARY.md, needed by gate G1).
For a non-medical practice challenge, the `nasa_sme` persona still works: it judges domain validity.

## Mode 1: Quick (about 1 minute, no LLM; after every merged feature)
```
python .claude/skills/judge-evals/scripts/run_evals.py auto --repo . --out evals/runs/quick
```
It exits non-zero on any ERROR, so it can be used as a pre-push check. Any `ERROR` line is a gate failure (disqualification-class or validity-class). Fix it before the
next feature. Warnings go on the Mission Director's list.

## Mode 2: Full panel (about 10 minutes; checkpoints h12, h24, h36, h46 and each FRR)
The MAIN session runs this, because subagents can't spawn subagents.
1. `python .claude/skills/judge-evals/scripts/run_evals.py all --repo . --out evals/runs/<tag> --stage <stage>`
   `<tag>` is any run-folder name (e.g. `h12`, `frr1`, `dry`). `<stage>` must be one of `draft|h12|h24|h36|h46`.
   For the practice dry run, add `--kickoff <practice start in UTC>` so the pre-kick-off gate checks the right time.
   This runs the auto checks and writes one prompt per (criterion × persona), plus `manifest.json`.
2. Read `manifest.json`. In ONE message, launch one agent per entry (agent type = `agent` field,
   normally `judge-simulator`; `validity-sceptic` for the sceptic persona). Pass the contents of the
   prompt file as the task. Each agent writes its JSON to the `answer` path.
   - Give judges the evidence, not our opinion. Don't tell them what score we expect.
   - Each judge also reads `evals/WINNING_TRAITS.md` so it knows what Global Nominee standard looks like.
3. `python .claude/skills/judge-evals/scripts/run_evals.py score --out evals/runs/<tag>`
   Malformed judge answers are listed under "Rejected judge answers": re-run those judges.
   This writes `scorecard.md`: gates, per-criterion median, caps from failed auto checks,
   judge disagreement flags, the local and global round scores, Δ vs the previous run, and the
   top fixes ranked by weight × headroom ÷ effort.
4. Mission Director merges the top fixes into the Must / Should / Won't list. Every fix must map to a
   requirement ID in docs/REQUIREMENTS.md (spec-writer scope guard). If it doesn't, either add the
   requirement via change control or drop the fix.

Score interpretation (ours, not official): the official guide describes only what a 5 looks like and publishes no weights, caps or pass mark. We read 3 as a typical decent entry and 4 as a strong local entry. The weighted percentage and the 80% target are our own planning aids.
Targets: ≥ 60% at h12 (demo story runs), ≥ 75% at h24, ≥ 80% at h36 and h46 with all gates passing.

## Mode 3: Self-check (every agent, before marking any task done)
Before reporting a task complete, the agent answers in two lines:
- Which requirement ID(s) did this move, and does the acceptance criterion now pass?
- Which rubric criterion does it raise, and does it trip any gate (SYNTHETIC label, citation, units,
  Australian English, AI says rules decide, licence of any new asset)?
If the answer to the first is "none", the task was out of scope. Tell the Mission Director.

## Judge-disagreement rule
If the judges for one criterion differ by 2 or more points, run one more `sceptic` pass on that criterion,
and treat the lower score as true until the gap is explained.

## Don'ts
- Don't let builders score their own work in Mode 2. The judges are fresh agents with no build context.
- Don't tune prompts or rubric anchors mid-event to raise scores. Rubric changes need a decision log line.
- Synthetic-data results never count as evidence of clinical accuracy (validity anchor 4+ requires
  that limitations are stated).
