# Road to flight

This is a hackathon prototype. It is built the way a real crew tool would have to be built: everything on the device, nothing that depends on a link to Earth. This page says exactly where it stands. We make no claim of clinical accuracy, agency approval or connection to any NASA system. NASA does not endorse this project. The app's "Privacy and limits" screen shows a short version of these lists.

## Built and working

- Runs with no network once loaded, in tablet, laptop and phone browsers, and can be installed to the home screen.
- The Day 87 Mars base story, inside a wider check-in: fifteen indicators in seven groups (Mind and sleep, Heart, Eyes, Muscle and bone, Food and fluid, Blood, Cabin and radiation). Most are compared with that person's own baseline. Six are daily; the weekly ones each fall due on their own day of the mission week.
- A near-vision self-check inside the app: one eye at a time, eight lines of letters, the worse eye kept and compared with the person's own earlier results. It says on screen that it is not a calibrated eye chart.
- Sourced limits that depend on the person: grip strength below 80% of their own baseline (NASA-STD-3001 Volume 1) is Urgent when it is also below their own range. Radiation dose is a running total shown as a share of NASA's career limit of 600 mSv (NASA-STD-3001 Volume 1), and a lower total is refused.
- Six rule kinds in one rules engine: level, trend, sustained, limit, combined and prompt. A slow sleep trend is flagged even when every night is inside the band, and two or more flagged signals are shown together on one card.
- A reaction tap test inside the app (five rounds, about thirty seconds).
- An explanation card on every indicator, with NASA hazard links (draft wording, awaiting clinician sign-off).
- A prompt scheduler on a mock crew timeline that never prompts during a critical operation (the demo EVA, 08:00 to 12:00) and re-plans when it runs 45 minutes late.
- An honest-reporting loop: a streak that counts check-ins and never results, a shared crew goal with no ranking, and insights that unlock at 14 and 30 days of streak.
- Five environment profiles (Mars base, In transit, Moon base, Space station and Remote Australia). Each changes the reply delay, who answers, the risks and the guidance line.
- A "Who sees what" privacy table on the "Privacy and limits" screen (draft policy).
- Input checks that refuse physically impossible readings.
- Readings, check-ins and cases saved on the device (IndexedDB, the database built into the browser). Cases queue and leave as one file when a link opens (store and forward); each case includes the other signals flagged that day.
- One action layer (`src/core/`) serves the screens, a command-line tool and AI agents, so all give the same answer.
- Real NASA data on screen: crew blood counts (OSDR, OSD-569), space weather (DONKI), the NASA cabin carbon dioxide limit (NASA-STD-3001 Volume 2), and the strength floor and career radiation limit (NASA-STD-3001 Volume 1).

## Placeholder today

- Every rule number (band factor 2, trend window 7, trend shift 1 standard deviation, run of 3, combined minimum of 2), every tier meaning, every threshold and every line of advice. Clinicians on our team must write and sign each one (CLINICIAN_REVIEW.md).
- The explanation card wording, taken from the team's challenge brief.
- The privacy table, the mood scale words and the streak and insight design.
- Which indicators a crew would really measure in flight, and how.
- All crew values, the cabin carbon dioxide readings and the radiation dose totals. They are SYNTHETIC.
- Using the strength floor and the career radiation limit as prompts. They are programme requirements, not clinical alert thresholds.

## Not built

- Voice input.
- Connections to real sensors or devices.
- A rover profile.
- Any calibrated or clinical eye test (for example retinal imaging).
- Any direct bone measurement. Exercise and grip strength stand in for it.
- Rules that change by environment. That is a clinician decision (CR-17).

## Needed before real use

- Rules written and tested by flight clinicians against real cases.
- Links to the measuring devices, the cabin sensor and the personal dosimeters a crew carries, instead of typed or simulated values.
- One shared record across crew devices on the spacecraft's own network, with crew privacy controls. The action layer is written so that a shared store can replace the on-device one without changing the screens.
- A ground system that receives case files and returns replies.
- A space agency's own safety, security and hardware approval.
