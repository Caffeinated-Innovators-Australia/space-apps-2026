# Project page draft

Draft text for every field of the Space Apps project page. Drafted with AI assistance from the team's confirmed concept (see AI_USE.md); the team edits and approves every line before it is submitted.

For the team before submitting: confirm or change the project name; swap the demo link for the final hosted video (30 seconds or less, see pitch/VIDEO_PLAN.md); add the doctor's own story to "The problem" if the family agrees, with no child's name, image or voice; and name any rules the clinicians have signed off in "What is real and what is not".

## Project name

Crew health check

## High-level summary

Most crew health tools show a number and stop. Ours treats the wait for Earth as part of the care. Jo is on Day 214 at a Mars base, 18 light-minutes from Earth, so no doctor can answer in under 36 minutes. Three days of low fluid raise a Watch early warning that names kidney stone risk, sourced to NASA's evidence report. Then pain starts. Three taps later the pattern is Act now. The tool says what to do first, including a urine test strip and a guided ultrasound, sends Earth a clinical handover, and counts down to the earliest possible reply. The doctor's reply lands back as a step. Then the same case runs for Sam, a station hand in the Simpson Desert, 640 km from the nearest hospital. Around 7 million Australians live in rural and remote areas, and in very remote Australia potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities. Built for Mars. Needed here. Rules decide every result; no AI model runs in the app.

## Link to project demo

Trailer (29.6 seconds): red sand on Day 214, a kidney stone case and a 36 minute wait for Earth, then the turn: the same ground is a remote Australian desert, where dust has grounded the aircraft. https://github.com/Caffeinated-Innovators-Australia/space-apps-2026/blob/main/pitch/trailer-draft.mp4

## Link to final project

https://caffeinated-innovators-australia.github.io/space-apps-2026/

Source code: https://github.com/Caffeinated-Innovators-Australia/space-apps-2026

## Detailed project description

**The problem.** NASA's Human Research Program names distance from Earth as one of the five hazards of human spaceflight, because medical care becomes harder to receive the further a crew travels. On the way to Mars a question to Earth's doctors can take up to 45 minutes to come back, and astronauts are not assumed to be medical experts. Kidney stones are a risk NASA names: “A total of 43 stone events in 29 crewmembers have been recorded by NASA since 2016” (NASA OCHMO Medical Technical Brief MTB-003, page 6). On Earth the same gap is distance: around 7 million people, 27% of Australians, live in rural and remote areas (Australian Institute of Health and Welfare).

**What is new here.**
- A countdown to the earliest possible reply, paired with the steps to take meanwhile. The delay is a working part of the care, with its own screen.
- A two-way clinical handover. The case reaches Earth in the order clinicians use (identify, situation, background, assessment, request), and the doctor's reply comes back as a step the crew can add.
- One engine, two places. The same rules and the same case run at a Mars base and at a desert station 640 km from a hospital. Only the delay, the responder and the wording change.

**The story in the app.** Today opens on one mark: a shape, a colour and a count, with a tile for each thing that needs attention and a body figure to tap. What is fine is not shown. An early warning comes before any symptom: three days of low fluid raise a Watch result. When Jo logs pain, the app asks about the pain first, then the other symptoms. A matched pattern is Act now, and it adds to the early warning instead of replacing it. The steps include a four-result urine test strip and a guided ultrasound that says only what to look for; it keeps no image and never says what an image means. The case goes to Earth, the countdown starts, and the reply arrives in the crew's Replies inbox. Vital signs run through two monitor alert rules, possible sepsis and possible shock. Oxygen saturation never raises an alert on its own, because readings run lower at exploration cabin pressure. An alert opens emergency mode: a separate team prototype with checklists adapted from the NASA Medical Checklist (JSC-48031), fed our readings and marked not for clinical use. Each result is a tier shown as colour, shape and word: Nothing to do (green circle), Watch (amber triangle), Act now (red square). It names a pattern to check, never a diagnosis.

**Shaped by our clinicians.** Our clinicians reviewed the screens twice. The first review cut the first screen from 991 words to under 180. The second added a red Emergency button on every page, the place's gravity, cabin air and radiation on the first screen, symptoms grouped by body area, and eight body areas where results such as an ECG or an eye pressure reading are logged and sent with a case. Record-only results are scored only once a clinician writes a rule for them.

**Voice and connected devices.** After feedback from the judges' mentors we added both. With full hands or gloves nobody can type, so the app asks each question aloud, takes down the answer, reads it back and saves only on "save". Vital signs can come from the crew's devices: a simulated kit in the demo, labelled SYNTHETIC, and readers for the published Bluetooth formats for heart rate, temperature, blood pressure and pulse oximetry. Each value keeps its source (device, voice or typed) and that goes to the doctor with the case. AI sits at the edges, where a read-back catches its mistakes. The clinicians' rules stay in the middle.

**How it works.** A static web app that runs entirely on the device, with no server and no sign-in, so it keeps working with no link to Earth. It watches fifteen indicators against each person's own baseline, a band of their own mean plus or minus 2 standard deviations, and a trend rule catches a slow slide that stays inside the band. Check-ins fit around the crew's day and are held during a critical operation such as a spacewalk. A streak counts check-ins, never results, so honest reporting is what is rewarded. Every rule lives in one plain-text file a clinician can read and edit; the app refuses to load a rule with no source or no sign-off field. The same rules engine runs as a command-line tool, so other software and AI agents get identical answers. Each ask in the challenge statement is mapped to a screen in docs/CHALLENGE.md.

**What is real and what is not.** Real NASA inputs: the crew blood counts and haemoglobin variation (OSD-569), the cabin carbon dioxide limit, the strength floor and the career radiation limit (NASA-STD-3001), and the radiation prompt days (DONKI). The four demo astronauts' values and the 213 mission days are synthetic, made by a script with a fixed seed, and labelled SYNTHETIC on every screen. The rules, steps and thresholds are placeholders from our clinical lead, marked as such on screen, until a clinician signs each one. We replayed the rules over all 213 days: they caught all three changes we had built in (low fluid on the day it began, cabin air in 3 days, the slow sleep slide in 14) and raised about four results per person per week on unchanged data, the number our clinicians tune next. Outside this prototype's scope: sensor connections, rules that change by environment, a calibrated eye test and direct bone measurement. This is a hackathon prototype for assessment and next steps. It does not diagnose and makes no clinical accuracy claim. Sources, evidence grades and limits are in docs/EVIDENCE.md.

**The team.** Four clinicians (digital health, retrieval medicine, telecare, crew physician) and an aerospace engineer.

**Tools and languages.** TypeScript, React, Vite, a rules file in YAML, Python for data preparation and the seeded mission generator, GitHub Pages for hosting. All open source; full list in REFERENCES.md.

## Use of SI (AI)

We used Claude Code (Anthropic) as a build assistant. The idea is the team's own, agreed in our team briefing before any AI was used on the project. AI wrote most of the app code, the tests, the data-preparation scripts and first drafts of our documents, all for review by the team. Explanation card wording is draft text taken from our challenge brief, awaiting clinician sign-off. AI drafted placeholder wording so the journey could be built; that wording is not clinical content until a clinician rewrites and signs it. We also used AI agents to review the build against the judging criteria, and to build features from our clinical lead's build pack. Inside the product, AI listens and speaks: the browser's speech recognition and voice take down spoken answers, read them back and read alerts aloud. Fixed rules decide every result, and no language model writes advice or sets a tier. We used no AI-generated images, video or audio; the body figure and icon are simple shapes drawn in code. Every use is logged in AI_USE.md in the repository, AI-assisted source files carry a note, and the page metadata states it.

## NASA data

What each NASA source decides in the app: OSD-569 sets how wide the haemoglobin range is; NASA-STD-3001 sets when cabin air is Act now, the strength floor and the radiation limit; DONKI sets the days the crew logs a radiation dose; the renal stone evidence report and the urinary health brief are the sources for the kidney stone warning and pathway.

- **NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count (LSDS-7).** https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real blood counts for four crew, three draws before launch and four after return. Bundled in the app. It is used in two ways: the variation in these crew members' own pre-flight haemoglobin draws sets the width of the haemoglobin band, and its laboratory ranges set the haemoglobin limit; and the "Real crew data" screen shows the same band rule running on the real crew.
- **NASA DONKI, solar energetic particle events** (Community Coordinated Modeling Center, NASA Goddard Space Flight Center). https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real space-weather records, bundled in the app. They fill the space-weather card, and the events that fall inside the mission window are listed in the mission data as radiation prompt days.
- **NASA-STD-3001 Volume 2.** The cabin carbon dioxide limit of 3 mmHg (one-hour average). It is a habitat design requirement, not a clinical alert threshold; using it as a prompt is our choice.
- **NASA-STD-3001 Volume 1, in-mission strength.** Skeletal muscle strength at or above 80% of baseline. We use it as the grip strength floor: 80% of each person's own baseline. It is a programme requirement, not a clinical alert threshold; using it as a prompt is our choice.
- **NASA-STD-3001 Volume 1, career radiation limit.** Career effective dose from spaceflight below 600 mSv. Radiation dose is shown as a share of this limit. Dose from earlier flights is not counted.
- **NASA Human Research Program: 5 Hazards of Human Spaceflight; Risks of Human Spaceflight; Ongoing HRP Research in Space.** https://www.nasa.gov/hrp/hazards/ , https://www.nasa.gov/hrp/risks/ , https://www.nasa.gov/hrp/ongoing-hrp-research/ . The hazards and risks pages are linked as sources on every explanation card, beside its hazard chips.

- **NASA Human Research Program, Evidence Report: Risk of Renal Stone Formation (2017), and the Risk of Renal Stone Formation page.** The source for the early warning: three days of low fluid raise a result that names kidney stone risk. https://humanresearchroadmap.nasa.gov/evidence/reports/Renal.pdf and https://www.nasa.gov/directorates/esdmd/hhp/risk-of-renal-stone-formation/
- **NASA Office of the Chief Health and Medical Officer, Medical Technical Brief MTB-003, Urinary Health, Rev A.** Quoted on the kidney stone pathway for prevention and for ultrasound, and the source given to our clinicians for the steps they will write. https://www.nasa.gov/wp-content/uploads/2025/01/ochmo-mtb-003-urinary-health.pdf
- **NASA, Risk of Altered Immune System Responses.** Quoted on the Infections and healing screen. https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
- **NASA Medical Checklist, JSC-48031 (Generic Rev K, PCN-4, 2008).** The source the emergency module's sixteen checklists are adapted from.

NASA does not endorse this project. No NASA logos are used.

## Space agency partner data and other references

- Canadian Space Agency, Monitoring Radiation for Astronaut Health. https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space? https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Australian Institute of Health and Welfare, Rural and remote health. https://www.aihw.gov.au/reports/rural-remote-australians/rural-and-remote-health
- Australian Institute of Health and Welfare, Deaths in Australia, variations by remoteness area. https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area
- healthdirect Australia, Kidney stones; and the US National Institute of Diabetes and Digestive and Kidney Diseases, Kidney stones: symptoms and causes. The sources for the symptom pattern in the kidney stone pathway. https://www.healthdirect.gov.au/kidney-stones and https://www.niddk.nih.gov/health-information/urologic-diseases/kidney-stones/symptoms-causes
- Australian and New Zealand Committee on Resuscitation, Guideline 8 and the Basic Life Support flowchart. The source for the steps on the Emergency screen; the wording is ours and is a placeholder. https://www.anzcor.org/
- Cited by the emergency module, not opened or verified by our build lead: a 2020 space medicine society guideline on resuscitation in microgravity (https://pmc.ncbi.nlm.nih.gov/articles/PMC7607644), a 2021 hypogravity resuscitation simulation study (https://www.pubmed.gov/33468291/) and two NASA exploration atmosphere reports (https://ntrs.nasa.gov/citations/20240003211 and https://ntrs.nasa.gov/citations/20220015741).
- Open-source libraries: React, Vite, TypeScript, js-yaml, Vitest (MIT or Apache 2.0). Fonts: IBM Plex (SIL Open Font License 1.1).
- Full list with licences: REFERENCES.md in the repository.
