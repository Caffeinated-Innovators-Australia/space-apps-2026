# Requirements: astronaut health decision support (working title)

Version: v0.3 · Status: building · Owner: Build lead · Last lint: 14 Nov 2026, see docs/DECISION_LOG.md

> Source of truth for WHAT we build. Every build task cites an ID from here.

## 1. Product in one line
- **Pitch:** A delay-aware health decision-support tool that compares each reading with the astronaut's own pre-flight baseline, says in plain words what it means and what to do, and counts down to Earth's earliest reply.
- **Primary user:** One astronaut on a Mars-class mission, not a medical expert, taking a routine reading alone.
- **Secondary users:** The crew medic; the flight surgeon on Earth who receives the case later.
- **Mission contexts covered:** Moon, Mars at its closest and farthest (about 3 to 22 minutes one way), and very remote Australia.

## 2. Demo story (judges see this end to end in under a minute)
1. The astronaut taps a region on the body figure and enters one reading: needs FR-01, FR-07, DR-02
2. The reading is plotted against their own pre-flight baseline band: needs FR-02
3. A tier appears as colour, shape and word, with "Why this alert?", its source and the review badge: needs FR-03, FR-04, SR-01
4. Numbered steps say what to do now, beside a countdown to Earth's earliest reply: needs FR-05, FR-06
5. The same baseline rule is shown working on real crew data, labelled "Data: NASA OSDR, OSD-569": needs DR-01

## 3. Requirements
Priority: Must / Should / Could / Won't. Status: todo / building / done / verified / cut. Gate (SR rows): pending / passed / failed / n/a.

| ID | Priority | Requirement | Acceptance criteria | Traces | Evals | Gate | Owner | Status |
|----|----------|-------------|---------------------|--------|-------|------|-------|--------|
| FR-01 | Must | The astronaut can enter one reading for the demo indicator by typing or tapping, with its unit shown | Given the reading screen, when a value is entered and saved, then the value appears with its unit and time | R1, R5, C6 | relevance | n/a | Build lead | done |
| FR-02 | Must | Each reading is compared with the astronaut's own pre-flight baseline and shown on a chart with a shaded baseline band and the change in words | Given a saved reading, when the result opens, then a chart shows the baseline band, the new point and text such as "+9 vs your baseline" | R2, C4 | relevance, creativity | n/a | Build lead | done |
| FR-03 | Must | Every result is sorted into one of three tiers (Self-manage, Crew medic, Urgent) shown as colour plus shape plus word | Given three test readings, one per tier, when each is saved, then the matching tier pill shows the right colour, shape and word | R2, Q4, U1 | validity, presentation | n/a | Build lead | done |
| FR-04 | Must | Every result carries "Why this alert?": one plain-language line, the hazard link, the threshold's source and confidence label, and a "Reviewed by our [role]" badge only on signed-off content | Given any result, when it is shown, then the why line, a named source and a confidence label are visible; the badge shows only where the rule file marks sign-off | Q2, Q3, C5 | validity | n/a | Build lead | done |
| FR-05 | Must | Every tier gives numbered next steps: what to do now, and who to tell | Given a result in any tier, when it is shown, then at least one numbered step is visible and no tier is a dead end | R3, Q5 | relevance, impact | n/a | Build lead | done |
| FR-06 | Must | A gap screen shows a live countdown to the earliest possible reply from Earth for the stated location, beside the steps to take meanwhile | Given a Crew medic or Urgent result, when the case is sent, then a countdown runs from the configured delay and the meanwhile steps are listed | R3, Q4 | creativity, impact | n/a | Build lead | done |
| FR-07 | Must | The home screen is a body figure with tappable regions; the demo region opens its reading and status | Given the home screen, when the demo region is tapped, then that region's reading screen opens; untappable regions are visibly inactive | R4, C1 | relevance, presentation | n/a | Build lead | done |
| SR-01 | Must | All tiering rules, advice steps and wording live in one reviewed rules file, each with source, evidence grade and sign-off status; unsigned values are marked as placeholders and listed in CLINICIAN_REVIEW.md; wording is assessment, never diagnosis | Given the rules file, when it is loaded, then every rule has a source and a sign-off field, and the app refuses to load a rule that lacks either | Q4 | validity | pending | Clinicians | building |
| DR-01 | Must | The baseline rule runs on real NASA crew data (NASA OSDR, OSD-569, Inspiration4 complete blood count) bundled locally, visible in the product with a text credit and no logo | Given the real-data view, when a crew member and analyte are chosen, then their pre-flight band and post-flight points are drawn and "Data: NASA OSDR, OSD-569" is on screen | R5, Q3 | relevance, validity | n/a | Build lead | done |
| DR-02 | Must | Every synthetic value on screen carries the SYNTHETIC label; every value carries its unit; one unit system per screen | Given any screen with synthetic data, when it renders, then a SYNTHETIC label sits on that card or chart and every number has a unit | R5 | validity | n/a | Build lead | done |
| NFR-01 | Must | The demo story runs offline from local data, with fonts and data bundled | Given the deployed app loaded once, when the network is disabled and the page reloaded, then the full demo story still runs | U1 | presentation, validity | n/a | Build lead | done |
| PR-01 | Must | Submission compliance: public URL that opens in a private window with no sign-in; Apache 2.0 licence; REFERENCES.md and AI_USE.md current; no NASA logo; no banned claims; all judge-evals gates pass | Given the repo and the deployed URL, when the quick judge check runs and the URL is opened in a private window, then there are no gate errors and the app loads | U1 | presentation, relevance | n/a | Build lead | done |
| FR-08 | Should | Each indicator shows how it is measured in flight, with a source | Given the reading screen, when "How is this measured?" is opened, then one sourced sentence is shown | Q1, C5 | relevance | n/a | Clinicians | todo |
| FR-09 | Should | One-tap case pack: bundles the alert, the trend, what the crew did and a checklist, queued for the next link to Earth | Given a result, when "Send to Earth" is tapped, then a case summary is shown as queued | R3, Q4 | impact | n/a | Build lead | done |
| FR-10 | Should | A radiation prompt driven by cached NASA DONKI space-weather events | Given the cached event file, when the home screen loads, then the latest event is shown with "Data: NASA DONKI" | C3, Q3 | relevance | n/a | Build lead | done |
| FR-11 | Should | "Feeling off? Tell us in one tap" symptom entry | Given the home screen, when the button is tapped, then a symptom can be logged in one tap | R1 | impact | n/a | Build lead | done |
| FR-12 | Could | The same screen shown in a remote-Australia setting for the video close | Given the settings, when Earth mode is chosen, then the delay and wording change | C2 | impact | n/a | Build lead | done |
| FR-13 | Should | Several crew profiles; each reading is assessed against that person's own baseline | Given two crew members, when the same value is entered for each, then each result uses that person's baseline | R2 | validity, impact | n/a | Build lead | done |
| FR-14 | Should | More than one indicator, added through data and rules files with no code change | Given the reading screen, when another blood measure is chosen, then it is assessed with its own unit, range and baseline | R1, R5 | relevance | n/a | Build lead | done |
| FR-15 | Should | Cases queue on the device and export as one file when a link opens (store and forward) | Given two queued cases, when export is pressed, then one file holds both and they show as exported | R3, Q4 | impact, creativity | n/a | Build lead | done |
| FR-16 | Should | One action layer serves the screens, a command-line tool and an agent-readable page | Given the same crew, indicator and value, when assessed on screen and from the command line, then the tier and why line match | U1 | validity | n/a | Build lead | done |
| FR-17 | Should | A "Road to flight" page states what is built, what is placeholder and what real use needs | Given the app, when Road to flight is opened, then the three lists are shown | U1 | validity, presentation | n/a | Build lead | done |
| NFR-03 | Should | Readings, logs and cases are stored on the device and survive a reload | Given a saved reading, when the page is reloaded with no network, then the reading is still listed | U1 | validity | n/a | Build lead | done |
| NFR-04 | Should | The app can be installed and is usable at tablet and phone sizes | Given tablet and phone widths, when the journey is run, then nothing scrolls sideways | U1, C2 | presentation | n/a | Build lead | done |
| NFR-02 | Should | Accessibility basics: contrast at least 4.5:1, keyboard focus visible, tier never by colour alone | Given the demo screens, when the accessibility check runs, then there are no serious contrast or focus failures | U1 | presentation | n/a | Build lead | todo |

## 4. Out of scope (explicit)
- A language model at run time: explanations are written text filled from each rule's own values, so the demo is offline and rules decide.
- Camera, ultrasound or device input; accounts; gamification; a server or shared record across devices.
- Any diagnosis, and any clinical accuracy claim.

## 5. Assumptions and open questions
- A1: The demo indicator is chosen by the clinicians (CLINICIAN_REVIEW.md, CR-01). Until then the build uses a marked placeholder.
- A2: OSD-569 holds pre-flight and post-flight draws only (three before launch, four after return, four crew, a three-day mission). We show it as real personal baselines and recovery, never as in-flight data.
- A3: The Moon and Mars delays shown are light-time arithmetic, labelled as such. The remote Australia retrieval time is a SYNTHETIC scenario.

## 6. Change history
| Version | Time | Change | Decision log # |
|---------|------|--------|----------------|
| v0.1 | 14 Nov 2026, morning AEDT | First draft from the confirmed concept | D-001 |
| v0.3 | 14 Nov 2026, AEDT | Mission-ready foundation added as Should items FR-13 to FR-17, NFR-03, NFR-04 | D-010 |
| v0.2 | 14 Nov 2026, morning AEDT | Must-haves built; FR-09, FR-10 and FR-11 built at the team lead's request | D-008 |
