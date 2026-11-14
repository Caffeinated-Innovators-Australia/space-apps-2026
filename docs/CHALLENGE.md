# Challenge: Create Health Monitoring Software for Astronauts on Space Missions

NASA Space Apps Challenge 2026. Official page: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

The verbatim statement is on the official page. This file holds our traceability table: each row is one thing the statement asks for.

## Traceability table

| Row | The statement asks for | Type | Where in the product |
|---|---|---|---|
| R1 | Software that gathers health indicators | Objective | Check-in screen for six indicators (sleep, resting heart rate, mood, reaction time, cabin carbon dioxide, haemoglobin), typed, tapped or taken as the 30-second tap test; "Nothing to report" one-tap log; "Feeling off?" one-tap log on home |
| R2 | Enables astronauts to evaluate their own health status | Objective | Result screen: mission trend chart against own baseline band, tier pill, trend and combined views |
| R3 | Enables astronauts to act on it, with guidance on treatments and health improvements | Objective | Result screen: numbered steps; case pack to Earth; gap screen with countdown and "meanwhile" tick list |
| R4 | A visual tool for self-assessment by the astronaut | Objective | Whole app: astronaut-facing, body figure home, one story for the day |
| R5 | Data that represents a health indicator, with units | Objective | Unit on every value; SYNTHETIC label on crew data; real NASA data on "Real crew data" (OSD-569), the space-weather card (DONKI) and the cabin carbon dioxide limit (NASA-STD-3001 Volume 2) |
| Q1 | Which measurements can be performed in space? | Guiding question | Explanation card on each indicator: "How to measure" (draft wording from the team's challenge brief, awaiting clinician sign-off) |
| Q2 | Why is an exam needed? | Guiding question | Explanation card on each indicator: "Why it matters" and "What to do" (draft wording, awaiting clinician sign-off) |
| Q3 | How do spaceflight hazards affect these health indicators? | Guiding question | Hazard chips on each explanation card, linked to NASA HRP hazard pages; home: space-weather card |
| Q4 | When might a result warrant attention from the crew or from flight surgeons on the ground? | Guiding question | Result screen: three tiers (green Self-manage, amber Crew medic, red Urgent); gap screen: when Earth can reply; privacy table: who sees what |
| Q5 | What actions can be taken to prevent a critical health condition? | Guiding question | Result screen: numbered steps for every tier; trend rule that flags a slow change before it becomes urgent |
| U1 | Present metrics and assessment clearly; interface design matters | Interface | Tier as colour, shape and word; "Why this alert?" with source and confidence; one story for the day |
| C1 | Consider a clickable human figure | Consideration | Home: tappable body figure with a region for each indicator |
| C2 | Consider different environments: spacecraft, station, rover, base | Consideration | Environment switcher: Mars base (fully built), In transit, Moon base, Space station, Remote Australia. Each changes the reply delay, who answers, the dominant risks and the guidance line. Rover: not built |
| C3 | Consider prompting measurements as part of the mission routine | Consideration | Prompt scheduler on a mock crew timeline: never prompts during a critical operation, holds check-ins until it ends, re-plans when a task runs late. Radiation prompt days from NASA DONKI |
| C4 | Consider gamification, dynamic charts and colour coding | Consideration | Honest-reporting loop: a streak that counts check-ins, never results; a shared crew goal with no ranking; insights unlocked after 14 and 30 days. Dynamic charts with the baseline band; colour coding with shape and word |
| C5 | Consider simple instructions, because astronauts are not assumed to be medical experts | Consideration | Plain-language explanation cards, why lines and steps throughout |
| C6 | Consider any input: keyboard, mouse clicks or camera images | Consideration | Keyboard, tap and the 30-second tap test. Voice input, sensor connections and camera (vision self-check): not built |

## Challenge resources (Resources tab, read 13 Nov 2026)

- NASA Human Research Program, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency, Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
