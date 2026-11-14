# References

Every third-party resource used, logged as it is added.

## NASA data and resources
- NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 blood study, Complete Blood Count (LSDS-7). Real crew data, bundled in the app and shown on the "Real crew data" screen; its haemoglobin variation sets the haemoglobin band and its laboratory reference ranges set the haemoglobin limit. https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), solar energetic particle events. Real events, bundled in the app, shown on the space-weather card and used to set the days that carry a radiation prompt. We acknowledge the Community Coordinated Modeling Center (CCMC) at Goddard Space Flight Center for the use of DONKI. https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA technical standard NASA-STD-3001, Volume 2. The source of the cabin carbon dioxide limit of 3 mmHg (one-hour average), used as the limit for the cabin carbon dioxide indicator. It is a habitat design requirement, not a clinical alert threshold. Cited by name only; no link is held in this repository.
- NASA technical standard NASA-STD-3001, Volume 1 (crew health). The source of two limits: in-mission skeletal muscle strength at or above 80% of baseline, used as the grip strength floor (80% of each person's own baseline); and the career effective dose limit of 600 mSv from spaceflight, used for the radiation dose indicator. Both are programme requirements, not clinical alert thresholds. Cited by name only; no link is held in this repository.
- NASA Human Research Program, 5 Hazards of Human Spaceflight (challenge resource). https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program, Risks of Human Spaceflight (challenge resource). https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space (challenge resource). https://www.nasa.gov/hrp/ongoing-hrp-research/

- NASA Human Research Program, Risk of Renal Stone Formation. Quoted on the kidney stone pathway screen as the reason the risk matters in spaceflight. https://www.nasa.gov/directorates/esdmd/hhp/risk-of-renal-stone-formation/ and https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=81
- NASA Office of the Chief Health and Medical Officer, Medical Technical Brief OCHMO-MTB-003, Urinary Health, Rev A. Quoted on the kidney stone pathway screen for prevention (fluid, exercise) and for ultrasound; the source found for the clinicians' steps (CR-26). https://www.nasa.gov/wp-content/uploads/2025/01/ochmo-mtb-003-urinary-health.pdf

## Space agency partner data
- Canadian Space Agency, Monitoring Radiation for Astronaut Health (challenge resource). https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space? (challenge resource). https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

The NASA Human Research Program hazard pages are linked as hazard chips on every explanation card, and the challenge resources are linked inside the app.

## Other sources
- The team's challenge brief: the source of the original six indicators and of the draft wording on every explanation card (how to measure, why it matters, what to do). The wording is draft and awaits clinician sign-off (CLINICIAN_REVIEW.md, CR-03).
- Australian Institute of Health and Welfare, Deaths in Australia: variations by remoteness area (potentially avoidable deaths, 2022 to 2024). https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area

- healthdirect Australia, Kidney stones (reviewed December 2024). The source for the symptom pattern in the kidney stone pathway and for fever as an urgent sign. Cited, not copied. https://www.healthdirect.gov.au/kidney-stones
- US National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK), Kidney stones: symptoms and causes. The source for being unable to pass urine as a sign to act on at once. Cited, not copied. https://www.niddk.nih.gov/health-information/urologic-diseases/kidney-stones/symptoms-causes

- Australian and New Zealand Committee on Resuscitation (ANZCOR), Guideline 8, Cardiopulmonary Resuscitation (approved April 2021), and the Basic Life Support flowchart (reviewed August 2023). The source for the seven steps, the 30 to 2 ratio and the 100 to 120 a minute rate on the Emergency screen. Cited, not copied: the wording is ours. https://www.anzcor.org/
- NASA Human Research Program, Evidence Report: Risk of Renal Stone Formation (2017). The source for dehydration and low urine output as reasons for the risk, used by the early warning (rule KS-00). https://humanresearchroadmap.nasa.gov/evidence/reports/Renal.pdf

- Australian Institute of Health and Welfare, Rural and remote health (updated 20 November 2025). The source for the share of Australians living in rural, remote and very remote areas, shown on the Earth card. https://www.aihw.gov.au/reports/rural-remote-australians/rural-and-remote-health

## Design criteria
- NASA-STD-3001 Volume 2, Revision F, section 10 and Appendix F (Display Standard). https://standards.nasa.gov/
- Human Integration Design Handbook, NASA/SP-2010-3407, Revision 1, chapter 10.
- NASA Ames Research Center, Using Color in Information Display Graphics (archived copies).
- How each criterion is applied: docs/DESIGN_CRITERIA.md.

- ISS Display and Graphics Commonality Standard, SSP 50313 (baseline, 2001). The source for the 12 point minimum text size. https://everyspec.com/NASA/NASA-JSC/NASA-SSP-PUBS/SSP_50313_3473/

## Code libraries (all open source)
| Library | Licence | Use |
|---|---|---|
| React, React DOM | MIT | User interface |
| Vite, @vitejs/plugin-react | MIT | Build tool |
| TypeScript | Apache-2.0 | Language |
| js-yaml | MIT | Reads the rules file |
| Vitest | MIT | Tests |

## Fonts
- IBM Plex Sans, IBM Plex Sans Condensed, IBM Plex Mono. SIL Open Font License 1.1. Bundled through the Fontsource packages. https://github.com/IBM/plex

## Other
- Apache License 2.0 text. https://www.apache.org/licenses/LICENSE-2.0
- The draft demo video (`pitch/demo-draft.mp4`) is a screen capture of our own app with text cards set in IBM Plex. No third-party footage, music or images.
- The draft trailer (`pitch/trailer-draft.mp4`) uses one photograph: "Simpson DSC02956 SA" by Ian Cochrane, Simpson Desert, South Australia. Licence: Creative Commons Attribution 2.0 (CC BY 2.0), https://creativecommons.org/licenses/by/2.0/ . Source: https://commons.wikimedia.org/wiki/File:Simpson_DSC02956_SA_(38195747046).jpg . Changes: cropped and colour graded. The credit is shown on the trailer's end card.
- The body figure, icons and charts are drawn in code by the team (AI-assisted, see AI_USE.md). No other third-party images are used.
