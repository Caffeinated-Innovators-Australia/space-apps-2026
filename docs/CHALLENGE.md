# Challenge: Create Health Monitoring Software for Astronauts on Space Missions

NASA Space Apps Challenge 2026. Official page: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

The verbatim statement is on the official page. This file holds our traceability table: each row is one thing the statement asks for.

## Traceability table

| Row | The statement asks for | Type | Where in the product |
|---|---|---|---|
| R1 | Software that gathers health indicators | Objective | Reading screen for fifteen indicators in seven groups (Mind and sleep, Heart, Eyes, Muscle and bone, Food and fluid, Blood, Cabin and radiation), typed, tapped on a scale, taken as the reaction tap test or taken as the near-vision self-check; on Today, "Feeling off?" one-tap symptoms and a "Nothing to report" one-tap log; vital signs; a four-result urine test strip; a weekly crew check-in; a screen for each body area, with results logged for the record only (such as an ECG or eye pressure) |
| R2 | Enables astronauts to evaluate their own health status | Objective | Result screen: the past four weeks against the own baseline band, tier pill and the rules that fired; Today: the combined card when two or more signals are flagged |
| R3 | Enables astronauts to act on it, with guidance on treatments and health improvements | Objective | Result screen: numbered steps; case pack to Earth; a Replies inbox for the answer from Earth; gap screen with countdown and "meanwhile" tick list; guided ultrasound steps; emergency mode, opened from an Act now alert into the team's emergency module |
| R4 | A visual tool for self-assessment by the astronaut | Objective | Whole app: astronaut-facing, body figure home, one story for the day |
| R5 | Data that represents a health indicator, with units | Objective | Unit on every value; SYNTHETIC label on crew data; real NASA data on "Real crew data" (OSD-569), the space-weather card (DONKI), the cabin carbon dioxide limit (NASA-STD-3001 Volume 2), and the grip strength floor and career radiation limit (NASA-STD-3001 Volume 1) |
| Q1 | Which measurements can be performed in space? | Guiding question | Explanation card on each indicator: "How to measure" (draft wording from the team's challenge brief, awaiting clinician sign-off). Near vision is measured in the app itself; the grip card says there is no in-flight way to measure bone directly. Vital signs, a urine test strip and a guided ultrasound in the kidney pathway |
| Q2 | Why is an exam needed? | Guiding question | Explanation card on each indicator: "Why it matters" and "What to do" (draft wording, awaiting clinician sign-off) |
| Q3 | How do spaceflight hazards affect these health indicators? | Guiding question | Hazard chips on each explanation card, with source links to NASA HRP hazards and risks pages; Today: space-weather card |
| Q4 | When might a result warrant attention from the crew or from flight surgeons on the ground? | Guiding question | Result screen: three tiers (green circle Nothing to do, amber triangle Watch, red square Act now); monitor alerts for possible sepsis and possible shock from vital signs; a red "Press Emergency now" banner the moment chest pain, short of breath or collapse is logged; sourced limits, including the NASA strength floor for grip strength and radiation dose as a share of NASA's career limit; gap screen: when Earth can reply; "Privacy and limits": who sees what |
| Q5 | What actions can be taken to prevent a critical health condition? | Guiding question | Result screen: numbered steps for every tier; trend rule that flags a slow change before it becomes urgent |
| U1 | Present metrics and assessment clearly; interface design matters | Interface | Tier as colour, shape and word; "Why this alert?" with source and confidence; one story for the day |
| C1 | Consider a clickable human figure | Consideration | Today: tappable body figure with nine areas (Mind and sleep, Eyes, Lungs, Heart, Kidneys, Gut, Blood and immune, Skin, Muscle and bone), each showing the most serious result in its group today, beside a list of all fifteen signals grouped by body system. Each area opens its own screen with its check-ins, its symptoms to report and its record-only results; Kidneys opens the kidney pathway |
| C2 | Consider different environments: spacecraft, station, rover, base | Consideration | Environment switcher: Mars base, In transit, Moon base, Space station, Remote Australia. Each changes the reply delay, who answers, the dominant risks and the guidance line, and carries its gravity, cabin atmosphere and what changes there (Location screen). Rover: not built |
| C3 | Consider prompting measurements as part of the mission routine | Consideration | Prompt scheduler on a mock crew timeline: never prompts during a critical operation, holds check-ins until five minutes after it ends, re-plans when a task runs late. Space-weather card with a radiation check step, from NASA DONKI |
| C4 | Consider gamification, dynamic charts and colour coding | Consideration | Honest-reporting loop: a streak that counts check-ins, never results; a shared crew goal with no ranking; insights unlocked at 14 and 30 days of streak. Dynamic charts with the baseline band; colour coding with shape and word |
| C5 | Consider simple instructions, because astronauts are not assumed to be medical experts | Consideration | Plain-language explanation cards, why lines and steps throughout |
| C6 | Consider any input: keyboard, mouse clicks or camera images | Consideration | Keyboard, tap, the PVT-style reaction check and the near-vision self-check (one eye at a time, tap per line). Voice: the app asks aloud and takes down spoken answers on Vital signs and the daily check-in, off until tapped. Connected devices: a simulated crew kit (SYNTHETIC) and readers for the published Bluetooth health formats. Camera input: not built |

## Challenge resources (Resources tab, read 13 Nov 2026)

- NASA Human Research Program, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency, Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
