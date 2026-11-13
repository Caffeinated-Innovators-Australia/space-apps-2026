## Build against the spec, score against the judges

15. **Every task cites a requirement ID** from docs/REQUIREMENTS.md (FR-/NFR-/DR-/SR-/PR-). No ID means out of
    scope: park it via flight-recorder or ask the Mission Director to add one (spec-writer change control).
16. **Self-check before "done"** (judge-evals Mode 3): name the requirement moved and the acceptance criterion
    now passing, the rubric criterion raised, and confirm no gate is tripped.
17. **Quick eval after every merge:** `python .claude/skills/judge-evals/scripts/run_evals.py auto --repo . --out evals/runs/quick`.
    Gate ERRORs are fixed before the next feature.
18. **Full judge panel at h12, h24, h36 and h46** (judge-evals Mode 2), dispatched by the main session in parallel.
    The scorecard's top fixes feed the Must / Should / Won't list.
19. **Spec lint at every checkpoint:** `python .claude/skills/spec-writer/scripts/spec_lint.py --requirements docs/REQUIREMENTS.md --challenge docs/CHALLENGE.md --rubric evals/rubric.yaml --stage <h12|h24|h36|h46>`.
20. **Open licence:** the repo has a LICENSE file (OSI licence), and every third-party asset is freely licensed and cited.
