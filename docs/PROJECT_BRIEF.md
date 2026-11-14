# Project brief

Agreed at kick-off, Sat 14 Nov 2026, by the team (Caffeinated Innovators Australia). The concept is the team's own, taken from the team briefing of 1 Nov 2026 and confirmed by the team after 9:00 am AEDT on 14 Nov. AI did not supply the idea.

## Concept (team's words, from the team briefing)

A delay-aware health decision-support tool, not a vitals dashboard. It compares readings with each astronaut's own pre-flight baseline and sorts results into three tiers (now named Nothing to do, Watch and Act now, D-031). It packages cases for a flight surgeon up to 22 minutes away (one way). Rules decide; AI only explains.

## Primary user

One astronaut on a Mars-class mission who is not a medical expert, taking a routine reading on their own, with Earth's doctors minutes of light-time away.

## Demo story

Day 214 on a Mars base. Jo's sleep has slid for three weeks, although each night stayed inside their own range. Cabin carbon dioxide has crept up and today reads 3.4 mmHg, above NASA's cabin limit of 3 mmHg. The tool flags the sleep trend and the cabin reading, asks for a reaction check, and shows the three flagged signals together on one card. Each result explains itself in plain words with its source. Sending the case opens a countdown to Earth's earliest reply, beside the steps to take meanwhile. The kidney thread runs the same day: three low-fluid days raise Watch, and pain turns it Act now. That night a fever with low blood pressure or fast breathing raises a possible-sepsis alert that opens emergency mode. Then the same case runs at a Simpson Desert station, 640 km from the nearest hospital. All crew values are SYNTHETIC.

## In scope

- Fifteen indicators in seven groups: mind and sleep, heart, eyes, muscle and bone, food and fluid, blood, cabin and radiation. They include a near-vision self-check and a reaction-time test built into the app.
- A rules file with level, trend, sustained, limit, combined and prompt rules. Every rule shows its source and is marked as a placeholder until a clinician signs it.
- Four SYNTHETIC crew members and 213 past mission days, made by a script with a fixed seed.
- Check-ins fitted around a mock crew day, never during a critical operation.
- A check-in streak and a shared crew goal that count check-ins, never results.
- Five places to compare: Mars base, In transit, Moon base, Space station and Remote Australia, each with its gravity, cabin atmosphere and how far help is.
- Added from the clinical lead's build pack v3.3 (14 Nov 2026): vital signs with monitor alert rules, a four-result urine test strip, guided ultrasound, a weekly crew check-in, a PVT-style reaction check, and the team's emergency module shown inside the app. Every value from the pack is a placeholder awaiting sign-off.
- Case packs that queue on the device and leave as one file when a link opens.
- The same personal-band rule shown on real NASA crew data (NASA OSDR, OSD-569).
- A "Privacy and limits" screen: who sees what, and what is built, placeholder and still needed.
- One action layer for the screens, a command-line tool and AI agents.
- Offline use and a public deployment.

## Out of scope

- Diagnosis, and any clinical accuracy claim.
- Any clinical threshold not written and signed off by the team's clinicians.
- Live connections to sensors or devices, voice input on our own screens, a rover profile, and any calibrated or clinical eye test.
- Rules that change by environment.
- Accounts or sign-in, a server, and a shared record across devices.
- A language model at run time.

## Source of the design

The team's challenge brief (a design guide written by the team) is the source of the indicator list and the recommended product shape.

## Team

Four clinicians (digital health, retrieval medicine, telecare, crew physician) and an aerospace engineer who leads the build. Clinicians write and sign off every clinical threshold.
