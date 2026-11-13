# Road to flight

This is a hackathon prototype. It is built the way a real crew tool would have to be built: everything on the device, nothing that depends on a link to Earth. This page says exactly where it stands. We make no claim of clinical accuracy, agency approval or connection to any NASA system.

## Built and working

- Runs with no network once loaded, in tablet, laptop and phone browsers, and can be installed to the home screen.
- Readings, symptom logs and cases are saved on the device (IndexedDB, the database built into the browser).
- Four crew profiles and four blood measures, each compared with that person's own baseline.
- Cases queue on the device and leave as one file when a link opens (store and forward).
- One action layer (`src/core/`) serves the screens, a command-line tool and AI agents, so all give the same answer.
- Real NASA data on screen: crew blood counts (OSDR, OSD-569) and space weather (DONKI).

## Placeholder today

- Every tiering rule, every threshold and every line of advice. Clinicians on our team must write and sign each one (CLINICIAN_REVIEW.md).
- Which indicators a crew would really measure in flight, and how.
- All crew values. They are SYNTHETIC.

## Needed before real use

- Rules written and tested by flight clinicians against real cases.
- Links to the measuring devices a crew carries, instead of typed values.
- One shared record across crew devices on the spacecraft's own network, with crew privacy controls. The action layer is written so that a shared store can replace the on-device one without changing the screens.
- A ground system that receives case files and returns replies.
- A space agency's own safety, security and hardware approval.
