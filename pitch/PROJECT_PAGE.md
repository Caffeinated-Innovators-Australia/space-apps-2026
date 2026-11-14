# Project page draft

Draft text for every field of the Space Apps project page. Drafted with AI assistance from the team's confirmed concept (see AI_USE.md); the team edits and approves every line before it is submitted. Items in [square brackets] are for the team to supply.

## Project name

[Team to choose. Working title in the app: "Crew health check".]

## High-level summary

On the way to Mars, a question to Earth's doctors can take up to 45 minutes to come back, and astronauts are not assumed to be medical experts. Our tool helps them act in that gap. It checks fifteen indicators in seven groups, from sleep to near vision. Take Day 87 on a Mars base: one astronaut's sleep has slid for three weeks, though every night sat inside their own range, and cabin carbon dioxide reads 3.4 mmHg, above NASA's cabin limit. The tool spots the trend, asks for a reaction test of about thirty seconds, explains each signal on a card with its NASA hazards, shows the signals together, and sends a case with a countdown to Earth's reply. Three things set it apart: check-ins that hold and re-plan around a spacewalk, a countdown to Earth's reply paired with steps to take meanwhile, and a streak that rewards honest reporting, never good numbers. Rules decide; no AI model runs in the app. The same idea matters on Earth: in very remote Australia, potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities.

## Link to project demo

Draft cut (28.9 seconds, no sound, captioned): the first 20 seconds follow a kidney stone on Mars, from an early warning to a reply from Earth; the last 9 seconds show the same gap at a remote outback station. https://github.com/Caffeinated-Innovators-Australia/space-apps-2026/blob/main/pitch/demo-draft.mp4

[Team: replace with the final hosted video, 30 seconds or less, with our doctor's voice. See pitch/VIDEO_PLAN.md.]

## Link to final project

https://caffeinated-innovators-australia.github.io/space-apps-2026/

Source code: https://github.com/Caffeinated-Innovators-Australia/space-apps-2026

## Detailed project description

**What it does.** The demo is one story: Day 87 on a Mars base. The astronaut checks in on the indicators due that day. Most are compared with their own baseline, a band of their own mean plus or minus 2 standard deviations. Jo's sleep has slid over three weeks while every night stayed inside the band, so a trend rule flags it. Cabin carbon dioxide reads 3.4 mmHg, above NASA's cabin limit of 3 mmHg. Either signal prompts a reaction-time check. Every indicator has an explanation card: how to measure, why it matters, what to do, the NASA hazards it relates to, and sources. When two or more signals are flagged on the same day, they are shown together on one card. Each result is a tier, shown as colour, shape and word: Self-manage, Crew medic, Urgent. One tap sends a case pack to Earth and opens a countdown to the earliest possible reply, with the steps to take meanwhile.

**Fifteen indicators in seven groups.** Mind and sleep: sleep, mood, reaction time (a tap test, about thirty seconds). Heart: resting heart rate, blood pressure upper and lower. Eyes: near vision, a self-check in the app, one eye at a time; it is not a calibrated eye chart and not a test for any eye condition, and the app says so. Muscle and bone: exercise plan done, grip strength, body mass; with no in-flight way to measure bone, these stand in for it. Food and fluid: fluid intake, food energy. Blood: haemoglobin. Cabin and radiation: cabin carbon dioxide, and radiation dose as a running total against NASA's career limit; both SYNTHETIC in the demo.

**Built around the crew's day.** A prompt scheduler runs on a mock crew timeline. It never prompts during a critical operation (the demo EVA, 08:00 to 12:00), holds those check-ins until five minutes after it ends, and re-plans when the EVA runs 45 minutes late. An honest-reporting loop keeps the data true: a streak counts check-ins, never results; a shared crew goal has no ranking; "Nothing to report" is a valid one-tap log; insights unlock at 14 and 30 days of streak. A "Who sees what" table on the "Privacy and limits" screen shows what the crew medic, the flight surgeon and the rest of the crew can see (a draft policy for the team to confirm).

**When symptoms form a pattern.** A medical event is more than one number. If an astronaut logs pain in the side or lower back, the app asks three quick questions. If the answers match the pattern a crew medic checks for a kidney stone, a risk NASA names for spaceflight, it raises a Crew medic or Urgent result, gives the steps to start now, keeps a pain log and builds a case for Earth with the person's recent fluid and exercise trends. It names a pattern to check, never a diagnosis. The symptoms, tiers and steps are placeholders for our clinicians to write.

**Both ends of the conversation.** A sent case is a handover in the order clinicians use: identify, situation, background, assessment, request. The remote doctor reads it in an Earth inbox and replies, and the reply lands back with the crew as steps they can add. If there is no link, the case queues. An early warning comes before any symptom: three days of low fluid raise a Crew medic result that names kidney stone risk, with NASA's evidence report as the source. An Emergency button on every screen opens basic life support steps one at a time, read aloud. Its wording is a placeholder taken from a published guideline.

**Five environments.** A switcher shows the same case at a Mars base, in transit, on a Moon base, on a space station and in very remote Australia. Each changes the reply delay, who answers, the dominant risks and the guidance line. The rules themselves do not yet change by environment; that is a clinician decision.

**How it answers the challenge.** It gathers health indicators (typed, tapped or measured readings), lets the astronaut evaluate them (personal baseline, trend, tier, explanation) and act (steps for every tier, escalation with a case pack). It takes up the challenge's considerations: a clickable body figure, different environments, prompting measurements in the mission routine, gamification, simple instructions and more than one kind of input. Each ask in the challenge statement is mapped to a screen in docs/CHALLENGE.md in our repository.

**How it works.** A static web app that runs entirely on the device, with no server and no sign-in, so it keeps working with no link to Earth. Readings are stored on the device. Every indicator is defined in data, so the screens group them by body system with no extra code. Six kinds of rule (level, trend, sustained, limit, combined and prompt) live in one plain-text file that a clinician can read and edit; the app refuses to load any rule that has no source or no sign-off field. Input checks refuse physically impossible readings. No AI model runs inside the app. The same rules engine is also available as a command-line tool, so other software and AI agents get identical answers.

**How often the rules speak up.** We replayed the rules over all 86 past mission days of our SYNTHETIC data, one day at a time. They caught all three changes we had built in: the cabin air in 3 days, the low fluid in 5 and the slow sleep slide in 17. They also raised about four results per person per week on data nobody changed, which is too many. We report that as found, and the numbers to tune are with our clinicians.

**What is real and what is not.** The haemoglobin variation and ranges, the cabin carbon dioxide limit, the NASA strength floor and career radiation limit, the crew blood counts on the "Real crew data" screen and the radiation prompt days are real NASA inputs. The four demo astronauts' values, the 86 mission days, the cabin carbon dioxide readings and the radiation dose totals are synthetic, made by a script with a fixed seed, and labelled SYNTHETIC on every screen. The rule numbers (band factor 2, trend window of 7 readings, shift of 1 standard deviation, run of 3, combined minimum of 2) are statistical conventions. [Clinicians: confirm before submission which rules are signed off. Until then:] the rules, the explanation card wording (draft, taken from our challenge brief) and the tier meanings are placeholders, marked as such on screen. Not built: voice input, sensor connections, a rover profile, rules that change by environment, any calibrated or clinical eye test (for example retinal imaging), and any direct bone measurement. This is a hackathon prototype for assessment and next steps. It does not diagnose and makes no clinical accuracy claim. Sources, evidence grades and limits are listed in docs/EVIDENCE.md.

**Why it matters.** NASA reports that “A total of 43 stone events in 29 crewmembers have been recorded by NASA since 2016”, with one episode reported during spaceflight itself (NASA OCHMO Medical Technical Brief MTB-003, page 6). On Earth, around 7 million people, 27% of Australians, live in rural and remote areas (Australian Institute of Health and Welfare). NASA's Human Research Program names distance from Earth as one of the five hazards of human spaceflight, because medical care becomes harder to receive the further a crew travels. [The team's own story, told by our doctor, with the family's agreement. No child's name, image or voice.] What is different here: most health tools show a number and stop. This one watches the slow trend a single reading hides, treats the wait for Earth as part of the care, and shows how long a reply will take, what to do meanwhile, and what Earth will see. NASA and partner agencies already work on medical decision support for crews; our contribution is a crew-facing sketch of one slice of it. In very remote Australia the same design could help someone hours from a hospital.

**The team.** Four clinicians (digital health, retrieval medicine, telecare, crew physician) and an aerospace engineer.

**Tools and languages.** TypeScript, React, Vite, a rules file in YAML, Python for data preparation and the seeded mission generator, GitHub Pages for hosting. All open source; full list in REFERENCES.md.

## Use of SI (AI)

We used Claude Code (Anthropic) as a build assistant. The idea is the team's own, agreed in our team briefing before any AI was used on the project. AI wrote most of the app code, the tests, the data-preparation scripts and first drafts of our documents, all for review by the team. Explanation card wording is draft text taken from our challenge brief, awaiting clinician sign-off. AI drafted placeholder wording so the journey could be built; that wording is not clinical content until a clinician rewrites and signs it. We also used AI agents to review the build against the judging criteria. No AI model runs inside the product: fixed rules decide every result. We used no AI-generated images, video or audio; the body figure and icon are simple shapes drawn in code. Every use is logged in AI_USE.md in the repository, AI-assisted source files carry a note, and the page metadata states it.

## NASA data

- **NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count (LSDS-7).** https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real blood counts for four crew, three draws before launch and four after return. Bundled in the app. It is used in two ways: the variation in these crew members' own pre-flight haemoglobin draws sets the width of the haemoglobin band, and its laboratory ranges set the haemoglobin limit; and the "Real crew data" screen shows the same band rule running on the real crew.
- **NASA DONKI, solar energetic particle events** (Community Coordinated Modeling Center, NASA Goddard Space Flight Center). https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real space-weather records, bundled in the app. They fill the space-weather card, and the events that fall inside the mission window are listed in the mission data as radiation prompt days.
- **NASA-STD-3001 Volume 2.** The cabin carbon dioxide limit of 3 mmHg (one-hour average). It is a habitat design requirement, not a clinical alert threshold; using it as a prompt is our choice.
- **NASA-STD-3001 Volume 1, in-mission strength.** Skeletal muscle strength at or above 80% of baseline. We use it as the grip strength floor: 80% of each person's own baseline. It is a programme requirement, not a clinical alert threshold; using it as a prompt is our choice.
- **NASA-STD-3001 Volume 1, career radiation limit.** Career effective dose from spaceflight below 600 mSv. Radiation dose is shown as a share of this limit. Dose from earlier flights is not counted.
- **NASA Human Research Program: 5 Hazards of Human Spaceflight; Risks of Human Spaceflight; Ongoing HRP Research in Space.** https://www.nasa.gov/hrp/hazards/ , https://www.nasa.gov/hrp/risks/ , https://www.nasa.gov/hrp/ongoing-hrp-research/ . The hazards and risks pages are linked as sources on every explanation card, beside its hazard chips.

NASA does not endorse this project. No NASA logos are used.

- **NASA Human Research Program, Evidence Report: Risk of Renal Stone Formation (2017), and the Risk of Renal Stone Formation page.** The source for the early warning: three days of low fluid raise a result that names kidney stone risk. https://humanresearchroadmap.nasa.gov/evidence/reports/Renal.pdf and https://www.nasa.gov/directorates/esdmd/hhp/risk-of-renal-stone-formation/
- **NASA Office of the Chief Health and Medical Officer, Medical Technical Brief MTB-003, Urinary Health, Rev A.** Quoted on the kidney stone pathway for prevention and for ultrasound, and the source given to our clinicians for the steps they will write. https://www.nasa.gov/wp-content/uploads/2025/01/ochmo-mtb-003-urinary-health.pdf
- **NASA, Risk of Altered Immune System Responses.** Quoted on the Infections and healing screen. https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/

## Space agency partner data and other references

- Canadian Space Agency, Monitoring Radiation for Astronaut Health. https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space? https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Australian Institute of Health and Welfare, Rural and remote health. https://www.aihw.gov.au/reports/rural-remote-australians/rural-and-remote-health
- Australian Institute of Health and Welfare, Deaths in Australia, variations by remoteness area. https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area
- healthdirect Australia, Kidney stones; and the US National Institute of Diabetes and Digestive and Kidney Diseases, Kidney stones: symptoms and causes. The sources for the symptom pattern in the kidney stone pathway. https://www.healthdirect.gov.au/kidney-stones and https://www.niddk.nih.gov/health-information/urologic-diseases/kidney-stones/symptoms-causes
- Australian and New Zealand Committee on Resuscitation, Guideline 8 and the Basic Life Support flowchart. The source for the steps on the Emergency screen; the wording is ours and is a placeholder. https://www.anzcor.org/
- Open-source libraries: React, Vite, TypeScript, js-yaml, Vitest (MIT or Apache 2.0). Fonts: IBM Plex (SIL Open Font License 1.1).
- [ABC News article for the team's story, if the story is used.]
- Full list with licences: REFERENCES.md in the repository.
