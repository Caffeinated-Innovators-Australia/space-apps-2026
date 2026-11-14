# Road to flight

This is a hackathon prototype. It is built the way a real crew tool would have to be built: everything on the device, nothing that depends on a link to Earth. This page says exactly where it stands. We make no claim of clinical accuracy, agency approval or connection to any NASA system. NASA does not endorse this project.

## Built and working

- Runs with no network once loaded, in tablet, laptop and phone browsers, and can be installed to the home screen.
- The Day 87 Mars base story: six daily indicators (sleep, resting heart rate, mood, reaction time, cabin carbon dioxide, haemoglobin), each compared with that person's own baseline.
- Six rule kinds in one rules engine: level, trend, sustained, limit, combined and prompt. A slow sleep trend is flagged even when every night is inside the band.
- A real 30-second reaction tap test inside the app.
- An explanation card on every indicator, with NASA hazard links (draft wording, awaiting clinician sign-off).
- A prompt scheduler on a mock crew timeline that never prompts during a critical operation and re-plans when a task runs late.
- An honest-reporting loop: a streak that counts check-ins and never results, a shared crew goal with no ranking, and insights that unlock after 14 and 30 days.
- Five environment profiles (Mars base fully built; In transit, Moon base, Space station and Remote Australia change the reply delay, who answers, the risks and the guidance line).
- A "Who sees what" privacy table (draft policy).
- Input checks that refuse physically impossible readings.
- Readings, check-ins and cases saved on the device (IndexedDB, the database built into the browser). Cases queue and leave as one file when a link opens (store and forward).
- One action layer (`src/core/`) serves the screens, a command-line tool and AI agents, so all give the same answer.
- Real NASA data on screen: crew blood counts (OSDR, OSD-569), space weather (DONKI) and the NASA cabin carbon dioxide limit (NASA-STD-3001 Volume 2).

## Placeholder today

- Every rule number (band factor 2, trend window 7, trend shift 1 standard deviation, run of 3), every tier meaning, every threshold and every line of advice. Clinicians on our team must write and sign each one (CLINICIAN_REVIEW.md).
- The explanation card wording, taken from the team's challenge brief.
- The privacy table, the mood scale words and the streak and insight design.
- Which indicators a crew would really measure in flight, and how.
- All crew values and the cabin carbon dioxide readings. They are SYNTHETIC.

## Not built

- Voice input.
- Connections to real sensors or devices.
- A rover profile.
- The vision self-check (camera).
- Rules that change by environment. That is a clinician decision (CR-17).

## Needed before real use

- Rules written and tested by flight clinicians against real cases.
- Links to the measuring devices and the cabin sensor a crew carries, instead of typed or simulated values.
- One shared record across crew devices on the spacecraft's own network, with crew privacy controls. The action layer is written so that a shared store can replace the on-device one without changing the screens.
- A ground system that receives case files and returns replies.
- A space agency's own safety, security and hardware approval.
