---
name: spec-writer
description: Turns the agreed kick-off concept into a traceable requirements doc (docs/REQUIREMENTS.md), a technical spec (docs/SPEC.md) and acceptance tests, then lints them against the challenge traceability table and the judging rubric. Use in hour 0–1 after the concept is agreed, whenever scope changes, and at every checkpoint. Also use as a scope guard whenever an agent is about to start a task.
---

# spec-writer

Purpose: stop agents building the wrong thing, and make sure everything we promised gets built.
The spec is the contract between the Mission Director, the builders and the judges' rubric.

**Dependencies.** The skill uses existing bench pieces: Mission Director, flight-recorder, architect,
clinical-safety-review and rules-checker (which writes docs/RULES.md). For a non-clinical practice project,
mark SR- rows `Gate: n/a`, or use none.

**Rule check.** This skill is generic tooling. Before kick-off (14 Nov) it must only be run on the
practice challenge or the dry run. Never write our real concept's requirements before kick-off.

## Inputs (read these first, in order)
1. `docs/CHALLENGE.md`: verbatim statement plus traceability table (R*, Q*, U*, C* rows)
2. `docs/RULES.md`: this year's rules and submission limits (from rules-checker)
3. `docs/PROJECT_BRIEF.md`: the concept, primary user, demo story and in/out of scope as agreed at kick-off
4. `evals/rubric.yaml`: the judging criteria the work will be scored against
5. `docs/DECISION_LOG.md` and `docs/HAZARD_LOG.md`

If PROJECT_BRIEF.md has no agreed one-line pitch, primary user and demo story, STOP and ask the
Mission Director. Don't invent a concept.

## Procedure (about 30–40 minutes at kick-off)
1. **Copy templates.** Copy `templates/REQUIREMENTS.md`, `templates/SPEC.md` and `templates/ACCEPTANCE.md`
   into `docs/` (skip any that already exist; never overwrite).
2. **Demo story first.** Write the 3–5 demo story steps in REQUIREMENTS.md §2. Every Must requirement
   must be visible in, or needed by, the demo story. If it isn't, it's a Should at best.
3. **Start from the seed.** Open `templates/SEED_REQUIREMENTS.md`: statement asks (S-xx), rules (P-xx) and judging
   non-functionals (N-xx), prepared before the event. Fold the P-xx rules rows into ONE
   `PR-01 Submission compliance` Must whose acceptance criterion is "judge-evals gates all pass + rules-checker PASS"
   (this keeps you under 12 Musts); split out only the risky ones. SEED_REQUIREMENTS.md is written for the 2026
   astronaut-health challenge; for the practice dry run use only its B and C sections.
   Every S-xx must be covered by a requirement or explicitly marked "not addressed: reason".
   **Derive requirements.** For every row in the CHALLENGE.md traceability table, write at least
   one requirement that addresses it, or record an explicit "not addressed: reason" decision.
   - IDs: `FR-xx` functional, `NFR-xx` non-functional, `DR-xx` data, `SR-xx` safety/clinical,
     `PR-xx` pitch/submission.
   - Priority (MoSCoW): `Must` means the demo or a rule fails without it. Keep it to 12 or fewer Musts.
   - Acceptance criteria: observable, binary, and testable in under 2 minutes ("Given/When/Then").
   - `Traces` = challenge row IDs; `Evals` = rubric criterion IDs (e.g. `relevance`, `validity`).
   - Any requirement that touches thresholds, advice wording, escalation or protocols is an `SR-`
     row with `Gate: pending` until clinical-safety-review passes.
4. **Out of scope.** List it explicitly in §5. Parked ideas go to the decision log via flight-recorder.
5. **Spec.** Fill SPEC.md: architecture sketch from the architect agent, data schema, interfaces,
   rules-engine contract, offline/fallback behaviour and the "label SYNTHETIC" mechanism.
   Each section names the requirement IDs it satisfies.
6. **Acceptance tests.** One test per Must in ACCEPTANCE.md. They are the scripted demo-breaker
   and checkpoint checks.
7. **Lint.** Run:
   `python .claude/skills/spec-writer/scripts/spec_lint.py --challenge docs/CHALLENGE.md --requirements docs/REQUIREMENTS.md --rubric evals/rubric.yaml`
   Fix every ERROR. WARNINGs go to the Mission Director.
8. **Log.** flight-recorder: "Spec v1 agreed: N Must / N Should / N Could; out of scope: …".

## Scope guard (use continuously)
Before any agent starts a build task, it must name the requirement ID(s) the task serves.
- No ID: the task is out of scope. Park it in the decision log, or ask the Mission Director to add
  a requirement (change control below).
- Gold-plating test: if the task makes something prettier but doesn't move an acceptance
  criterion or a rubric score, it waits until all Musts pass.

## Change control
- Add, drop or re-prioritise a requirement only via the Mission Director, with one decision log line.
- After the hour-12 checkpoint, no new Musts. After the hour-24 scope freeze, only cuts.
- Re-run the lint after every change; bump the version in REQUIREMENTS.md.

## At each checkpoint (hours 12, 24, 36 and 46)
Update the `Status` column (`todo` / `building` / `done` / `verified` / `cut`), re-run the lint with
`--stage h12|h24|h36|h46` (stricter at each stage), then run the judge-evals skill.
Any Must that isn't `verified` goes to the top of the task list.
