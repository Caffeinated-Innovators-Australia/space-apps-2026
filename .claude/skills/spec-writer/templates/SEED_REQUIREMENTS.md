# Seed requirements: derived from the challenge statement and the rules, NOT from our concept

Use this at kick-off as the starting checklist for docs/REQUIREMENTS.md. Each row is something **any** solution to
"Create Health Monitoring Software for Astronauts on Space Missions" (2026) is judged on, whatever the idea.
It was prepared before the event from public material; it contains no design for our solution.

**At kick-off (hour 0):**
1. Diff the official statement in section 0 (captured 3 Nov) against the live challenge page and docs/CHALLENGE.md (captured 29 Oct).
2. The rule rows in section B were updated on 14 Nov from the official 2026 Judging & Awards and Submission guides.
3. Then turn each row into concrete FR/NFR/DR/SR/PR requirements for the agreed concept.

Statement text source: **the official challenge page**, copied verbatim on 3 Nov 2026
(https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/). It replaces the third-party mirror text
used earlier, which matched. Metadata: Difficulty **Intermediate**; Subjects **Human Exploration, Software, Space Exploration**.
At kick-off, diff this against the live page once more (resources and wording can change on 13 Nov).

## 0. Official challenge text

### Statement (verbatim, official page)

**Summary**

> Long-duration missions expose astronauts to space radiation, isolation and confinement, altered gravity, and a hostile closed environment, which can bring immune changes, bone loss, cardiovascular events, and behavioral health problems. On long missions, astronauts carry much of the responsibility for spotting these changes in themselves. Your challenge is to build a health monitoring software that gathers health indicators and enables astronauts to evaluate and act on the status of their health.

**Background**

> With rising investment in spacecraft technology and research, space missions have become more ambitious. NASA's Artemis program recently accomplished a crewed lunar flyby, and NASA and others have plans to send humans to Mars in the future. With increasingly longer missions, astronauts will be more exposed to the hostile space environment, which brings both physical and mental health risks.
>
> NASA's Human Research Program has mapped the five hazards of human spaceflight, which are space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments. These hazards can contribute to health problems such as immune system changes, bone density loss, cardiovascular events, inadequate nutrition, behavioral health conditions, and others. Astronauts must be capable of making health assessments on themselves during a mission, to prevent and treat health problems that may arise. Some useful health indicators are blood pressure, heart rate, blood sugar, body temperature, daily sleep hours, and mood.

**Objectives**

> Your challenge is to create a visual tool that helps astronauts assess their own health during space missions and provides guidance on treatments and health improvements. You may consider gathering data from the user through any kind of input—keyboard text, mouse clicks, or camera images, for example. Any kind of data can be used, as long as it represents a health indicator, such as blood sugar levels in mg/dL or ultrasound images.
>
> You can use NASA's Human Research Program resources, along with the publicly available resources from other space agencies, to understand how spaceflight hazards affect human health, and to decide which indicators are useful and how they can support a quick assessment. Which measurements can be performed in space? Why is an exam needed? How do spaceflight hazards affect these health indicators? When might a result warrant attention from the crew or from flight surgeons on the ground? What actions can be taken to prevent a critical health condition? These are questions worth considering as you develop your solution.
>
> User interface design plays an important role in presenting metrics and diagnosis clearly. You may consider taking advantage of animations and interactivity to present the information. For example, the software could display a human figure where each part of the body is clickable and displays information about its function and health status.

**Potential considerations**

> You may (but are not required to) consider the following:
>
> - Your tool could provide health insights for astronauts in different environments, such as a spacecraft, a space station, a rover, or a base on another planet or moon.
> - Your tool could prompt astronauts to take measurements or complete specific actions from time to time as a part of the mission routine.
> - Your tool could include the following features:
>   - A gamification system to help astronauts engage with tasks that support their health
>   - Dynamic charts that show how astronaut's health indicators change over time
>   - Color coding that helps the astronaut interpret the status of a health indicator at a glance
> - Do not assume that astronauts know everything about how to assess their health. Your tool could provide simple instructions and explanations covering measurements, health indicators, and risks.
>
> For data and resources related to this challenge, refer to the Resources tab at the top of the page. More resources may be added before the hackathon begins.

### Resources tab (official page)

Source: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources

Read on 13 Nov 2026. The tab lists reference pages only, with no datasets:

- NASA HRP, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA HRP, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA HRP, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- CSA, Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp


## A. Explicit asks in the challenge statement → map to CHALLENGE.md rows

| Seed | The statement asks for | Likely CHALLENGE.md row | Judged under | Evidence judges will look for |
|---|---|---|---|---|
| S-01 | Software that **gathers** health indicators | R* | Relevance | At least one input path working in the demo (typed, click, or camera/image) |
| S-02 | Enables astronauts to **evaluate** their health status | R* | Relevance, Validity | Each reading is interpreted, not just displayed |
| S-03 | Enables astronauts to **act** on it, with guidance on treatments and health improvements | R* | Relevance, Impact | A next step or recommendation for every result state (the most-missed verb in 2026 repos) |
| S-04 | A **visual** tool for **self**-assessment by the astronaut | R*, U1 | Relevance, Presentation | Astronaut-first UI (not a ground console) |
| S-05 | Any input modality: keyboard, mouse, camera images | R* / C* | Creativity | Input choice justified for in-flight use |
| S-06 | Any data that represents a health indicator, with units (e.g. mg/dL, ultrasound images) | R* | Validity | Units on every value; data sources cited |
| S-07 | Q: Which measurements can be performed in space? | Q1 | Relevance, Validity | Per-indicator "how it's measured in flight" with a source |
| S-08 | Q: Why is an exam needed? | Q2 | Relevance, Presentation | Plain-language reason shown at the point of measurement |
| S-09 | Q: How do spaceflight hazards affect these indicators? | Q3 | Relevance, Validity | Hazard to indicator link, cited (e.g. NASA RIDGE hazards) |
| S-10 | Q: When might a result warrant attention from crew or flight surgeons? | Q4 | Validity, Impact | Escalation criteria with sources and evidence strength; who gets notified |
| S-11 | Q: What actions can prevent a critical condition? | Q5 | Impact, Validity | Preventive actions and countermeasures, cited |
| S-12 | Present metrics and **diagnosis** clearly (UI design matters) | U1 | Presentation, Validity | Clear hierarchy; "assessment with confidence" wording, not bare diagnoses |
| S-13 | Consider: clickable human figure | C* | Presentation, Creativity | Optional; only if it leads to a decision |
| S-14 | Consider: different environments (spacecraft, station, rover, base) | C* | Impact | Behaviour changes by context, or a stated reason why not |
| S-15 | Consider: prompting measurements from time to time as part of the mission routine | C* | Relevance, Validity | A schedule grounded in a source, not arbitrary nagging |
| S-16 | Consider: gamification, dynamic charts, colour coding | C* | Presentation | Colour never the only cue (accessibility); charts readable in under 5 seconds |
| S-17 | Consider: simple instructions, because astronauts may not be medical experts | C* / U1 | Presentation, Validity | Step-by-step measurement instructions in plain Australian English |

## B. Rules-derived requirements (official 2026 guides and Terms, checked 13 Nov) → PR- / DR- rows

| Seed | Requirement | Source (see research/judging_criteria_2026.md) | Consequence if missed |
|---|---|---|---|
| P-01 | Responds to one of the official 2026 challenges | 2026 Judging & Awards Guide | Not eligible for global judging |
| P-02 | Demo is one public link: video ≤ 30 s **or** ≤ 7 slides including title and intro slides | 2026 Submission Guide | Not eligible for Global Judging |
| P-03 | Final project link is public, opens with no sign-in, works in a private window | 2026 Submission Guide | Can't be judged |
| P-04 | "NASA Data" field: at least one NASA data source or resource, by name, ID and link, and how it was used. Partner data goes in "Space Agency Partner Data and Other References" | 2026 Submission Guide | Not eligible for a Global Award |
| P-05 | References: every library, image, dataset and text source cited; third-party material freely available or open source, with its licence named in the documentation | 2026 Terms, verified 3 Nov: "You must cite every source…"; "Any licenses applicable to your Solution Materials must be identified in the documentation" | Award can be forfeited |
| P-06 | Our work under an OSI open-source licence (Apache 2.0 by default); LICENSE file in repo | 2026 Terms, verified 3 Nov (https://www.spaceappschallenge.org/legal/) | Rules breach |
| P-07 | SI (AI) use statement: "Each team's project submission must include a description of how SI tools were used during the development of their project." | 2026 FAQ, verified 3 Nov (2026 calls AI "Super Intelligence (SI)") | Rules breach |
| P-08 | English text, or English subtitles on any non-English audio | 2026 guides | Can't be judged |
| P-09 | All members (≤ 6) registered to the Melbourne event and on the project page | 2026 FAQ | Member ineligible |
| P-10 | Submitted before Sun 15 Nov 23:59 AEDT; submission confirmed live and screenshotted | 2026 timeline | No submission |
| P-11 | No project work before kick-off: "participants should NOT begin working on their project until the hackathon begins on November 14, 2026 (9:00 a.m. local time)" | Team Formation Guide and FAQ, verified 3 Nov | Disqualification |
| P-12 | Project page fields complete: Project Name, High-Level Summary, demo link, final project link, Detailed Description, Use of SI, NASA Data, Space Agency Partner Data and Other References | 2026 Submission Guide | Can't submit |
| P-13 | No recognisable name, voice, image or likeness of anyone under 18 anywhere in the submission; no profanity | 2026 Terms; 2026 Submission Guide | Rules breach |
| P-16 | AI did not supply the idea. AI-generated images and video carry a visible watermark; AI audio, code and data are acknowledged in descriptive text and metadata. No NASA logos, flags or mission identifiers | 2026 Submission Guide | Rules breach |
| P-17 | All members are confirmed (not waitlisted) at the Melbourne event and appear on the Members tab before submission closes | 2026 Judging & Awards Guide | Not eligible for Global Judging |
| P-18 | NASA data is a core component of the solution and visible in the product, not only cited | 2026 Judging & Awards Guide (Relevance) | Low Relevance score |
| P-14 | Use only datasets rated GREEN in research/data_licence_audit.md (OSDR OSD-569/570/571/575, DONKI, Curiosity RAD, MIT-BIH, Sleep-EDF, PTB-XL, PhysioNet wearable stress set v1.0.0, nsrdb/nsr2db, Synthea, CC-BY POCUS files, NASA POWER). AMBER (CAMUS, MMASH (ODbL share-alike), non-commercial POCUS files) only after the local lead OKs it, and never committed to the repo. RED (EchoNet-Dynamic, COVIDx-US, unlicensed POCUS files, NLSP/LSDA, MIMIC) is not used; judge-evals check A21 enforces this | data_licence_audit.md; 2026 Terms | Rules breach or forfeited award |
| P-15 | Use the audit's ready-to-paste attribution text for every dataset (e.g. PhysioNet now cites Pollard et al. 2026; Synthea data keeps its SNOMED and LOINC notices) | data_licence_audit.md §4 | Citation failure |

## C. Non-functional seeds implied by how judging works

| Seed | Requirement | Why |
|---|---|---|
| N-01 | The demo story runs end to end offline from local data | Judges review quickly; network and microphone failures happen |
| N-02 | Every on-screen synthetic value is labelled SYNTHETIC | Validity; challenge-author judges are domain experts |
| N-03 | Every threshold shows its source and evidence grade | Validity; rare in the 2026 field (see COMPETITOR_ARCHETYPES.md) |
| N-04 | A first-time viewer understands the core screen in 5 seconds | Presentation; 30-second demo format |
| N-05 | Accessibility basics: contrast, font size, colour plus text and icon for alert states | Winning trait W20 |
