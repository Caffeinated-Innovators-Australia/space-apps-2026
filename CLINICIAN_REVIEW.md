# Clinician review list

Nothing here is clinical advice until a clinician signs it off. The build uses each item as a visibly marked placeholder until then.

| # | Item | Placeholder in the build | Source found | Status |
|---|---|---|---|---|
| CR-01 | Which single indicator the demo journey uses | Haemoglobin, chosen by the build only because it is in the NASA dataset. Other options: white cell count, or a non-blood reading such as resting heart rate | OSD-569 holds complete blood counts only | Needs clinician decision |
| CR-02 | How far from personal baseline counts as Self-manage, Crew medic or Urgent | Band = lowest to highest pre-flight value, widened by 5% of the pre-flight mean (the 5% is invented for the build). Inside band: Self-manage. Outside band but inside the laboratory range: Crew medic. Outside both: Urgent | No published space-specific alert bands were found for heart rate, blood pressure, oxygen saturation, temperature or haemoglobin (team evidence pack, gaps 5 and 7) | Needs clinician decision |
| CR-03 | The "Why this alert?" line, "Why this check?", "How is it measured in flight?" and the hazard link | Why-alert lines state only the numbers. The other two show "Placeholder" on screen | NASA HRP hazards and risks pages | Needs clinician wording |
| CR-04 | The numbered steps for each tier, and the "meanwhile" steps on the gap screen | Generic steps written for the build (log, repeat, tell your crew medic, send the case to Earth) | To be written by clinicians | Needs clinician wording |
| CR-05 | Units for display (for example haemoglobin in g/L, the Australian convention, or g/dL as in OSD-569) | As in source data | OSD-569 uses g/dL | Needs clinician decision |
| CR-06 | Role wording for the review badge ("Reviewed by our ...") | No badge shown | Team design system | Needs clinician decision |
| CR-07 | Laboratory reference range for the demo astronaut | 13.2 to 17.1 g/dL, the range the source laboratory reported for male crew in OSD-569 | NASA OSDR, OSD-569 (LSDS-7) | Needs clinician decision |
| CR-08 | Confidence label for the rule (High, Medium, Low) | Low | Team design system | Needs clinician decision |
| CR-09 | The action shown beside a solar particle event | "Log your personal dosimeter reading." | NASA DONKI event list; Canadian Space Agency radiation monitoring article | Needs clinician decision |
| CR-10 | The one-tap symptom list | Headache, Tired, Dizzy, Nauseous, Poor sleep, Low mood | Written for the build | Needs clinician decision |

All of the above live in `rules/rules.yaml` and `src/data/demo.json`. To sign a rule off, replace `signed_off_by: placeholder` with the reviewing clinician's role.
