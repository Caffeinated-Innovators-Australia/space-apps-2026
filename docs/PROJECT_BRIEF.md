# Project brief

Agreed at kick-off, Sat 14 Nov 2026, by the team (Caffeinated Innovators Australia). The concept is the team's own, taken from the team briefing of 1 Nov 2026 and confirmed by the team after 9:00 am AEDT on 14 Nov. AI did not supply the idea.

## Concept (team's words, from the team briefing)

A delay-aware health decision-support tool, not a vitals dashboard. It compares readings with each astronaut's own pre-flight baseline and sorts results into three tiers: Self-manage, Crew medic, Urgent. It packages cases for a flight surgeon up to 22 minutes away (one way). Rules decide; AI only explains.

## Primary user

One astronaut on a Mars-class mission who is not a medical expert, taking a routine reading on their own, with Earth's doctors minutes of light-time away.

## Demo story

Day 87 on a Mars base. Crew member 1's sleep has slid for three weeks, although each night stayed inside their own range. Cabin carbon dioxide has crept up and today reads 3.4 mmHg, above NASA's cabin limit of 3 mmHg. The tool flags the sleep trend and the cabin reading, asks for a thirty-second reaction test, and shows the three flagged signals together on one card. Each result explains itself in plain words with its source. Sending the case opens a countdown to Earth's earliest reply, beside the steps to take meanwhile. All crew values are SYNTHETIC.

## In scope

- Six indicators: sleep, resting heart rate, mood, reaction time (a tap test in the app), cabin carbon dioxide and haemoglobin. Each is compared with the person's own baseline and has an explanation card.
- A rules file with level, trend, sustained, limit, combined and prompt rules. Every rule shows its source and is marked as a placeholder until a clinician signs it.
- Four SYNTHETIC crew members and 86 past mission days, made by a script with a fixed seed.
- Check-ins fitted around a mock crew day, never during a critical operation.
- A check-in streak and a shared crew goal that count check-ins, never results.
- Five places to compare: Mars base, In transit, Moon base, Space station and Remote Australia.
- Case packs that queue on the device and leave as one file when a link opens.
- The same personal-band rule shown on real NASA crew data (NASA OSDR, OSD-569).
- A "Privacy and limits" screen: who sees what, and what is built, placeholder and still needed.
- One action layer for the screens, a command-line tool and AI agents.
- Offline use and a public deployment.

## Out of scope

- Diagnosis, and any clinical accuracy claim.
- Any clinical threshold not written and signed off by the team's clinicians.
- Live connections to sensors or devices, voice input, a rover profile and the vision self-check.
- Rules that change by environment.
- Accounts or sign-in, a server, and a shared record across devices.
- A language model at run time.

## Source of the design

The team's challenge brief (a design guide written by the team) is the source of the indicator list and the recommended product shape.

## Team

Four clinicians (digital health, retrieval medicine, telecare, crew physician) and an aerospace engineer who leads the build. Clinicians write and sign off every clinical threshold.
