# Project page draft

Draft text for every field of the Space Apps project page. Drafted with AI assistance from the team's confirmed concept (see AI_USE.md); the team edits and approves every line before it is submitted. Items in [square brackets] are for the team to supply.

## Project name

[Team to choose. Working title in the app: "Crew health check".]

## High-level summary

On the way to Mars, a question to Earth's doctors can take up to 45 minutes to come back. Astronauts are not assumed to be medical experts, yet for that time they are on their own. Our tool helps an astronaut act in that gap. They take a reading; the tool compares it with their own pre-flight baseline, says in plain words what it means and where that rule comes from, gives numbered next steps, and counts down to the earliest moment Earth can reply. Results fall into three tiers: Self-manage, Crew medic, Urgent. Fixed, reviewable rules decide; AI only explains. The same rule runs on real crew data from NASA's Open Science Data Repository, where it shows why a personal baseline matters: one crew member's usual value sat outside the standard laboratory range before launch. The same problem exists on Earth. In very remote Australia, potentially avoidable deaths run at 252 per 100,000 people against 88 in major cities. A crew far from Earth and a family hours from a hospital need the same thing: care that starts before the expert arrives.

## Link to project demo

[30-second video, to be recorded. Must be 30 seconds or less.]

## Link to final project

https://caffeinated-innovators-australia.github.io/space-apps-2026/

Source code: https://github.com/Caffeinated-Innovators-Australia/space-apps-2026

## Detailed project description

**What it does.** The astronaut taps a body region, enters a reading, and gets four things on one screen: the reading against their own baseline on a chart; a tier shown as colour, shape and word; a plain-language "Why this alert?" with its source and a confidence label; and numbered next steps. If the result needs more than self-care, one tap sends a case pack to Earth and opens a countdown to the earliest possible reply, with the steps to take meanwhile as a tick list. A "Where are you?" selector shows the same reading at the Moon (reply in seconds), at Mars at its closest and farthest (about 6 and 45 minutes for a reply), and in very remote Australia.

**How it answers the challenge.** It gathers health indicators (typed or tapped readings, and a one-tap "Feeling off?" log), lets the astronaut evaluate them (personal baseline, tier, explanation) and act (steps for every tier, escalation with a case pack). Each ask in the challenge statement is mapped to a screen in docs/CHALLENGE.md in our repository.

**How it works.** A static web app that runs entirely on the device, with no server and no sign-in, so it keeps working with no link to Earth. Readings are stored on the device. Tiering rules live in one plain-text file that a clinician can read and edit; the app refuses to load any rule that has no source or no sign-off field. No AI model runs inside the app. The same rules engine is also available as a command-line tool, so other software and AI agents get identical answers.

**What is real and what is not.** The crew blood counts and space-weather events are real NASA data. The demo astronaut's values are synthetic and labelled SYNTHETIC on every screen. [Clinicians: confirm before submission which rules are signed off. Until then:] the tiering rule and its wording are placeholders, marked as such on screen. This is a hackathon prototype for assessment and next steps. It does not diagnose and makes no clinical accuracy claim. Sources, evidence grades and limits are listed in docs/EVIDENCE.md.

**Why it matters.** [The team's own story, told by our doctor, with the family's agreement. No child's name, image or voice.] NASA and partner agencies already work on medical decision support for crews; our contribution is a crew-facing sketch of one slice of it: a routine self-check, a transparent rule, and an honest view of how long help will take.

**The team.** Four clinicians (digital health, retrieval medicine, telecare, crew physician) and an aerospace engineer.

**Tools and languages.** TypeScript, React, Vite, a rules file in YAML, Python for one-off data preparation, GitHub Pages for hosting. All open source; full list in REFERENCES.md.

## Use of SI (AI)

We used Claude Code (Anthropic) as a build assistant. The idea is the team's own, agreed in our team briefing before any AI was used on the project. AI wrote most of the app code, the tests, the data-preparation scripts and first drafts of our documents, all for review by the team. AI drafted placeholder wording so the journey could be built; that wording is not clinical content until a clinician rewrites and signs it. We also used AI agents to review the build against the judging criteria. No AI model runs inside the product: fixed rules decide every result. We used no AI-generated images, video or audio; the body figure and icon are simple shapes drawn in code. Every use is logged in AI_USE.md in the repository, AI-assisted source files carry a note, and the page metadata states it.

## NASA data

- **NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4 complete blood count (LSDS-7).** https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 . Real blood counts for four crew, three draws before launch and four after return. Bundled in the app. Our baseline rule runs on it on the "Real crew data" screen, and its laboratory reference ranges are used by the tiering rule.
- **NASA DONKI, solar energetic particle events** (Community Coordinated Modeling Center, NASA Goddard Space Flight Center). https://ccmc.gsfc.nasa.gov/tools/DONKI/ . Real space-weather records, bundled in the app, shown on the home screen with the radiation prompt.
- **NASA Human Research Program: 5 Hazards of Human Spaceflight; Risks of Human Spaceflight; Ongoing HRP Research in Space.** https://www.nasa.gov/hrp/hazards/ , https://www.nasa.gov/hrp/risks/ , https://www.nasa.gov/hrp/ongoing-hrp-research/ . Background for which indicators matter; linked inside the app.

NASA does not endorse this project. No NASA logos are used.

## Space agency partner data and other references

- Canadian Space Agency, Monitoring Radiation for Astronaut Health. https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space? https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Australian Institute of Health and Welfare, Deaths in Australia, variations by remoteness area. https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area
- Open-source libraries: React, Vite, TypeScript, js-yaml, Vitest (MIT or Apache 2.0). Fonts: IBM Plex (SIL Open Font License 1.1).
- [ABC News article for the team's story, if the story is used.]
- Full list with licences: REFERENCES.md in the repository.
