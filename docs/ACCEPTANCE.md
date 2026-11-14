# Acceptance tests

One test per requirement. Each runs on the live app in under 2 minutes: https://caffeinated-innovators-australia.github.io/space-apps-2026/

All tests follow the Day 87 story for Crew member 1 at the Mars base. Start each run from Today, choose "Crew 1" and "Mars base", and press "Reset the demo" if it shows. Every crew value is SYNTHETIC. The demo values below are the ones the reading screen offers as a chip ("Demo value for today" or "Sensor value").

## Must requirements

| Test | Req ID | Steps | Expected | Result (h12) | Result (h24) | Result (h46) |
|------|--------|-------|----------|--------------|--------------|--------------|
| AT-01 | FR-01 | On Today, tap the Sleep row. Tap the demo value 6.2. Press "Check against my baseline". Then go back to Today and tap "Nothing to report" | The result shows "Sleep" with the time it was taken and 6.2 h. "Nothing to report" is logged as a check-in | | | |
| AT-02 | FR-02 | Log the sleep demo value 6.2 and open the result | A chart shows the past four weeks against the own expected range band, today's point is marked, and the tile states the change from baseline in words (for example "−0.9 h vs your baseline") | | | |
| AT-03 | FR-03 | Log resting heart rate 59, sleep 6.2 and cabin carbon dioxide 3.4 | Three results: Self-manage (circle), Crew medic (triangle), Urgent (octagon). Each pill shows colour, shape and word | | | |
| AT-04 | FR-04 | Open the sleep result, then the cabin carbon dioxide result | Each shows "Why this alert?", a plain why line, a source and a confidence label. The sleep result names rule TR-01. The cabin result cites the NASA cabin limit of 3.0 mmHg (LM-01). Each shows "Placeholder rule, awaiting clinician review" and no review badge | | | |
| AT-05 | FR-05 | Open the three results from AT-03 | Every tier shows numbered steps. Self-manage: log and check in again. Crew medic and Urgent: repeat, tell your crew medic, send the case to Earth | | | |
| AT-06 | FR-06 | Log cabin carbon dioxide 3.4. Press "Send case to Earth" | The gap screen shows "Earth reply possible in" counting down from 44:36, with the "Meanwhile" steps as tick boxes beside the case pack | | | |
| AT-07 | FR-07 | On Today, tap "Mind", "Heart" and "Blood" on the body figure, then each row in "Your signals" | Each opens that indicator's check-in. "Bones" shows "Not in this demo" and does nothing. The six rows show the day's status | | | |
| AT-08 | SR-01 | Open any raised result and read the source line. Then, in a local copy, delete one rule's `source` line in `rules/rules.yaml` and reload | The live result shows its source, confidence and placeholder note. The local copy shows "Rules file refused" with the reason, and assesses nothing | | | |
| AT-09 | DR-01 | Open "Real crew data". Pick a crew member and "Haemoglobin" | The pre-flight band and post-flight draws are drawn, and "Data: NASA OSDR, OSD-569" is on screen | | | |
| AT-10 | DR-02 | Walk Today, a reading screen, a result, the gap screen and the Outbox | A SYNTHETIC label sits on each card or chart with crew data. Every number has a unit | | | |
| AT-11 | NFR-01 | Load the app once. Turn the network off. Reload and run AT-01 to AT-06 | The story completes with no network | | | |
| AT-12 | PR-01 | Open the URL in a private window. Run the quick judge check | The app loads with no sign-in. The check reports no gate errors | | | |

## Should requirements

| Test | Req ID | Steps | Expected | Result (h12) | Result (h24) | Result (h46) |
|------|--------|-------|----------|--------------|--------------|--------------|
| AT-13 | FR-18 | Log sleep 6.2, cabin carbon dioxide 3.4, then press "Next: thirty-second reaction test" and log 318 | Sleep is Crew medic by trend (TR-01). Cabin carbon dioxide is Urgent (LM-01, SU-01, TR-01). Reaction time is Crew medic (PB-01). Today shows "Several signals have moved together" listing all three (CM-01) | | | |
| AT-14 | FR-19 | On Today, set the mission clock to 09:30. Then switch on "EVA runs 45 min late" | At 09:30 the morning check-ins are held during the EVA and moved to 12:05. With the slip on, they move to 12:50. No check-in is due during the EVA | | | |
| AT-15 | FR-20 | Read the streak card. Log sleep, resting heart rate and mood with any values | The streak counts check-ins, never results, and goes up by one once all three daily check-ins are logged. The crew goal shows a crew total with no names | | | |
| AT-16 | FR-21 | Open the reading screen for each of the six indicators | Each card shows "How to measure", "Why it matters", "If it is out of range", the NASA hazards it relates to, sources, and the draft-wording note. No review badge | | | |
| AT-17 | FR-22 | Log cabin carbon dioxide 3.4 and send the case. On the gap screen, choose each of the five places | The countdown, the guidance line and the delay change. The tier colour and shape stay the same. In Remote Australia the words change (for example "Retrieval team can reach you in") | | | |
| AT-18 | FR-23 | Open "Privacy and limits" | The "Who sees what" table (you, crew medic, flight surgeon, rest of crew) shows with the draft-policy note | | | |
| AT-19 | FR-24 | In a local copy, run `python3 scripts/make_mission_data.py` twice and compare `src/data/seed.json` | The file is identical both times and carries the SYNTHETIC note | | | |
| AT-20 | NFR-05 | Open Sleep and type 30. Open Resting heart rate and type 5 | Each is refused with a plain message giving the allowed range. The save button stays off and nothing is saved | | | |

14 Nov 2026: automated run on a local build at desktop, tablet and phone sizes passed the journey, scheduler, streak, export, persistence and impossible-reading checks. Clinician sign-off (SR-01) remains open.
