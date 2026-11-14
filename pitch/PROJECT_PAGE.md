# Project page draft

Draft text for every field of the Space Apps project page. Drafted with AI assistance from the team's confirmed concept (see AI_USE.md); the team edits and approves every line before it is submitted. Items in [square brackets] are for the team to supply.

## Project name

[Team to choose. Working title in the app: "Crew health check".]

## High-level summary

On the way to Mars, a question to Earth's doctors can take up to 45 minutes to come back, and astronauts are not assumed to be medical experts. Our tool helps them act in that gap. Take Day 87 on a Mars base: one astronaut's sleep has slid for three weeks, though every night sat inside their own range, and cabin carbon dioxide reads 3.4 mmHg, above NASA's cabin limit. The tool spots the trend, prompts a 30-second reaction test, explains each signal on a card with its NASA hazards, shows the signals together, and sends a case with a countdown to Earth's reply. Rules decide; AI only explains. The same idea matters on Earth: in very remote Australia, potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities.

## Link to project demo

Draft cut (29.1 seconds, no sound, predates the Day 87 story and will be recut): https://github.com/Caffeinated-Innovators-Australia/space-apps-2026/blob/main/pitch/demo-draft.mp4

[Team: replace with the final hosted video, 30 seconds or less, with our doctor's voice. See pitch/VIDEO_PLAN.md.]

## Link to final project

https://caffeinated-innovators-australia.github.io/space-apps-2026/

Source code: https://github.com/Caffeinated-Innovators-Australia/space-apps-2026

## Detailed project description

**What it does.** The demo is one story: Day 87 on a Mars base. The astronaut checks in on six indicators: sleep, resting heart rate, mood, reaction time (a real 30-second tap test inside the app), cabin carbon dioxide (from a cabin sensor, SYNTHETIC in the demo) and haemoglobin (weekly). Each is compared with their own baseline, a band of their own mean plus or minus 2 standard deviations. Crew member 1's sleep has slid over three weeks while every night stayed inside the band, so a trend rule flags it. Cabin carbon dioxide reads 3.4 mmHg, above NASA's cabin limit of 3 mmHg. Either signal prompts a reaction-time check. Every indicator has an explanation card: how to measure, why it matters, what to do, the NASA hazards it relates to, and sources. Flagged signals are shown together as one picture. Each result is a tier, shown as colour, shape and word: Self-manage, Crew medic, Urgent. One tap sends a case pack to Earth and opens a countdown to the earliest possible reply, with the steps to take meanwhile.

**Built around the crew's day.** A prompt scheduler runs on a mock crew timeline. It never prompts during a critical operation (the demo EVA, 08:00 to 12:00), holds those check-ins until it ends, and re-plans when a task runs late. An honest-reporting loop keeps the data true: a streak counts check-ins, never results; a shared crew goal has no ranking; "Nothing to report" is a valid one-tap log; insights unlock after 14 and 30 days of check-ins. A "Who sees what" table shows what the crew medic, the flight surgeon and the rest of the crew can see (a draft policy for the team to confirm).

**Five environments.** A switcher shows the same case at a Mars base (fully built), in transit, on a Moon base, on a space station and in very remote Australia. Each changes the reply delay, who answers, the dominant risks and the guidance line. The rules themselves do not yet change by environment; that is a clinician decision.

**How it answers the challenge.** It gathers health indicators (typed, tapped or measured readings), lets the astronaut evaluate them (personal baseline, trend, tier, explanation) and act (steps for every tier, escalation with a case pack). It takes up the challenge's considerations: a clickable body figure, different environments, prompting measurements in the mission routine, gamification, simple instructions and more than one kind of input. Each ask in the challenge statement is mapped to a screen in docs/CHALLENGE.md in our repository.

**How it works.** A static web app that runs entirely on the device, with no server and no sign-in, so it keeps working with no link to Earth. Readings are stored on the device. Six kinds of rule (level, trend, sustained, limit, combined and prompt) live in one plain-text file that a clinician can read and edit; the app refuses to load any rule that has no source or no sign-off field. Input checks refuse physically impossible readings. No AI model runs inside the app. The same rules engine is also available as a command-line tool, so other software and AI agents get identical answers.

**What is real and what is not.** The haemoglobin variation and ranges, the cabin carbon dioxide limit, the crew blood counts on the "Real crew data" screen and the radiation prompt days are real NASA inputs. The four demo astronauts' values, the 86 mission days and the cabin carbon dioxide readings are synthetic, made by a script with a fixed seed, and labelled SYNTHETIC on every screen. The rule numbers (band factor 2, trend window of 7 readings, shift of 1 standard deviation, run of 3) are statistical conventions. [Clinicians: confirm before submission which rules are signed off. Until then:] the rules, the explanation card wording (draft, taken from our challenge brief) and the tier meanings are placeholders, marked as such on screen. Not built: voice input, sensor connections, a rover profile, the vision self-check, and rules that change by environment. This is a hackathon prototype for assessment and next steps. It does not diagnose and makes no clinical accuracy claim. Sources, evidence grades and limits are listed in docs/EVIDENCE.md.

**Why it matters.** NASA's Human Research Program names distance from Earth as one of the five hazards of human spaceflight, because medical care becomes harder to receive the further a crew travels. [The team's own story, told by our doctor, with the family's agreement. No child's name, image or voice.] What is different here: most health tools show a number and stop. This one watches the slow trend a single reading hides, treats the wait for Earth as part of the care, and shows how long a reply will take, what to do meanwhile, and what Earth will see. NASA and partner agencies already work on medical decision support for crews; our contribution is a crew-facing sketch of one slice of it. In very remote Australia the same design could help someone hours from a hospital.

**The team.** Four clinicians (digital health, retrieval medicine, telecare, crew physician) and an aerospace engineer.

**Tools and languages.** TypeScript, React, Vite, a rules file in YAML, Python for data preparation and the seeded mission generator, GitHub Pages for hosting. All open source; full list in REFERENCES.md.

## Use of SI (AI)

We used Claude Code (Anthropic) as a build assistant. The idea is the team's own, agreed in our team briefing before any AI was used on the project. AI wrote most of the app code, the tests, the data-preparation scripts and first drafts of our documents, all for review by the team. Explanation card wording is draft text taken from our challenge brief, awaiting clinician sign-off. AI drafted placeholder wording so the journey could be built; that wording is not clinical content until a clinician rewrites and signs it. We also used AI agents to review the build against the judging criteria. No AI model runs inside the product: fixed rules decide every result. We used no AI-generated images, video or audio; the body figure and icon are simple shapes drawn in code. Every use is logged in AI_USE.md in the repository, AI-assisted source files carry a note, and the page metadata states it.

## NASA data

- **NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count (LSDS-7).** https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real blood counts for four crew, three draws before launch and four after return. Bundled in the app. It is used in two ways: the variation in these crew members' own pre-flight haemoglobin draws sets the width of the haemoglobin band, and its laboratory ranges set the haemoglobin limit; and the "Real crew data" screen shows the same band rule running on the real crew.
- **NASA DONKI, solar energetic particle events** (Community Coordinated Modeling Center, NASA Goddard Space Flight Center). https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real space-weather records, bundled in the app. They fill the space-weather card, and the events that fall inside the mission window set the days that carry a radiation prompt.
- **NASA-STD-3001 Volume 2.** The cabin carbon dioxide limit of 3 mmHg (one-hour average). It is a habitat design requirement, not a clinical alert threshold; using it as a prompt is our choice.
- **NASA Human Research Program: 5 Hazards of Human Spaceflight; Risks of Human Spaceflight; Ongoing HRP Research in Space.** https://www.nasa.gov/hrp/hazards/ , https://www.nasa.gov/hrp/risks/ , https://www.nasa.gov/hrp/ongoing-hrp-research/ . The hazard pages are linked as hazard chips on every explanation card.

NASA does not endorse this project. No NASA logos are used.

## Space agency partner data and other references

- Canadian Space Agency, Monitoring Radiation for Astronaut Health. https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space? https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Australian Institute of Health and Welfare, Deaths in Australia, variations by remoteness area. https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area
- Open-source libraries: React, Vite, TypeScript, js-yaml, Vitest (MIT or Apache 2.0). Fonts: IBM Plex (SIL Open Font License 1.1).
- [ABC News article for the team's story, if the story is used.]
- Full list with licences: REFERENCES.md in the repository.
