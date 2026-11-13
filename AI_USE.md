# Use of AI (SI)

Logged as we go: what, where, who reviewed it. AI did not supply the idea. The concept came from the team briefing of 1 Nov 2026 and was confirmed by the team at kick-off.

| When (AEDT) | Tool | What it did | Where | Reviewed by |
|---|---|---|---|---|
| 14 Nov 2026, morning | Claude Code (Anthropic) | Read the team's preparation notes and the official rules | not in repo | Team lead |
| 14 Nov 2026, morning | Claude Code (Anthropic) | Drafted the requirements, spec, acceptance tests and logs from the team's confirmed concept | docs/, REFERENCES.md, CLINICIAN_REVIEW.md, README.md | Awaiting build lead |
| before kick-off | Claude Code (Anthropic) | Wrote generic checking tools (requirements lint, rules and judging checks) with no project content | .claude/skills/, evals/rubric.yaml | Team lead |
| 14 Nov 2026, morning | Claude Code (Anthropic) | Wrote the app code: rules engine, tests, screens, charts, the code-drawn body figure and icon, the data fetch script and the deploy workflow | src/, rules/, scripts/, public/, .github/ | Awaiting build lead |
| 14 Nov 2026, morning | Claude Code (Anthropic) | Drafted placeholder rule wording and a placeholder margin so the journey could be built. These are not clinical content until a clinician rewrites and signs them | rules/rules.yaml, CLINICIAN_REVIEW.md | Awaiting clinicians |
| 14 Nov 2026, morning | Claude Code (Anthropic) | Wrote the space-weather card and its data script, the one-tap symptom log and the case pack; drafted a placeholder symptom list and radiation step | src/App.tsx, scripts/fetch_donki.py, src/data/demo.json | Awaiting build lead and clinicians |
| 14 Nov 2026, morning | Claude Code (Anthropic) | Ran a panel of 13 AI judge agents on the build; wrote the place selector, remote Australia mode and Earth-benefit card; drafted the evidence file, extra hazards and the challenge-to-screen map | src/, docs/EVIDENCE.md, docs/HAZARD_LOG.md, docs/CHALLENGE.md | Awaiting build lead and clinicians |

AI-generated code is acknowledged here and in commit messages (Co-Authored-By line). Source files carry an AI-assistance note, and the page metadata states it. No AI-generated photos, video or audio are used. The body figure and icon are simple shapes drawn in code, not generated images.
