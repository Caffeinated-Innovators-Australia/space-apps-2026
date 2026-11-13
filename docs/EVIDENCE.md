# Evidence: every number and rule, with its source and its limits

This file lists each value the app shows or uses. Nothing here is a clinical accuracy claim. The tool is a hackathon prototype for assessment and next steps, not diagnosis.

Evidence grades: **A** physics or a published standard; **B** real data from a small group; **C** expert practice without outcome data; **D** carried over from Earth practice, not tested in spaceflight; **None** a build placeholder with no evidence behind it.

## Numbers and rules in the product

| Item | Value | Source | Grade | Limits |
|---|---|---|---|---|
| Personal baseline band, method | Lowest to highest pre-flight value, widened on each side | Team design choice. No published self-check band for haemoglobin in spaceflight was found | None | Placeholder until our clinicians choose a method (CLINICIAN_REVIEW.md, CR-02) |
| Band margin | 5% of the pre-flight mean | Invented for the build so the journey could be shown | None | A demo parameter, not a clinical threshold. Shown on screen as "Placeholder rule" with confidence Low |
| Tier logic | Inside band: Self-manage. Outside band, inside laboratory range: Crew medic. Outside both: Urgent | Team design choice | None | Placeholder. A single reading can raise a tier; whether a repeat reading should be required first is a clinician decision (CR-12) |
| Laboratory reference range, haemoglobin | 13.2 to 17.1 g/dL (male crew), 11.7 to 15.5 g/dL (female crew) | As reported by the laboratory in NASA OSDR, OSD-569 (LSDS-7) | D | An Earth laboratory range. Not tested for in-flight use |
| Real crew blood counts | Four crew, three draws before launch, four after return | NASA OSDR, OSD-569, Inspiration4 | B | Four people, a three-day mission, no in-flight draws. Shown as pre-flight and post-flight only |
| Demo astronaut baseline and readings | All values | Made up by the team | None | SYNTHETIC, labelled on screen. Shows that the workflow runs, nothing more |
| One-way signal delay, Moon | about 1.3 s | Arithmetic: about 384,400 km at the speed of light | A | Light time only; relay and processing add to it |
| One-way signal delay, Mars | about 3 min (closest, 54.6 million km) to about 22 min (farthest, 401 million km) | Arithmetic from published distance ranges | A | Light time only; near solar conjunction links can be lost altogether |
| Remote Australia retrieval time | 60 minutes | SYNTHETIC scenario | None | Labelled SYNTHETIC on screen |
| Solar particle events | Latest event date; days with events in about the past year | NASA DONKI (CCMC, NASA Goddard Space Flight Center) | B | Records for near-Earth space. Not a dose, and not linked to any tier |
| Radiation step | "Log your personal dosimeter reading." | Written for the build | None | Placeholder (CR-09) |
| Symptom list | Six one-tap options | Written for the build | None | Placeholder (CR-10). Symptoms are logged only; they never change a tier |
| Avoidable deaths, very remote Australia against major cities | 252 against 88 per 100,000 people, 2022 to 2024, age-standardised | Australian Institute of Health and Welfare, Deaths in Australia | A | Describes the size of the remote-care problem. It says nothing about this tool's effect |

## What the real data does and does not show

On the "Real crew data" screen, one crew member's haemoglobin sat below the laboratory range in one of their own pre-flight draws. A population range alone would flag a value that is usual for that person, which is the reason for comparing each reading with a personal baseline. This is one observation in four people. It illustrates the idea; it does not prove it.

## Known limits

- Every tiering rule and every line of advice is a placeholder until a clinician on the team signs it off. The app shows this on screen and shows no review badge.
- A baseline built from three draws is a small sample. Normal day-to-day variation within one person is not modelled.
- No space-specific alert bands were found in published sources for haemoglobin, heart rate, blood pressure, oxygen saturation or temperature. Any such band is a team decision.
- Complete blood counts are not a routine in-flight self-measurement today. The demo indicator was chosen because it is in the open NASA dataset, pending the clinicians' choice (CR-01).
- Synthetic results are never evidence of clinical accuracy.

## Where this sits beside existing work

NASA and the Canadian Space Agency already work on medical decision support and on wearable monitoring for crews, and on care that depends less on Earth. This prototype adds no sensors and replaces no flight surgeon or crew medical officer. It is a hackathon-scale sketch of one crew-facing slice: a routine self-check, a transparent rule with its source, and a clear view of how long a reply will take and what to do meanwhile. It is not connected to any NASA system.
