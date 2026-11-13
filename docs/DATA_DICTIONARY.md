# Data dictionary

| Dataset | ID | Link | Licence | What we use | Real / SYNTHETIC |
|---|---|---|---|---|---|
| NASA Open Science Data Repository, Inspiration4 blood study | OSD-569 (file LSDS-7, Complete Blood Count) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 | NASA open data (CC0 unless marked); cited | Complete blood count for four crew at three pre-launch and four post-return timepoints, with laboratory reference ranges. The within-person variation of the pre-launch draws sets the width of the personal band in the tiering rule | Real |
| NASA DONKI, solar energetic particle (SEP) events | DONKI SEP | https://ccmc.gsfc.nasa.gov/tools/DONKI/ | NASA public data; cited | The latest solar particle events from about the past year, bundled at build time, shown on the home screen with the radiation prompt | Real |
| Demo crew profiles, baselines and readings (`src/data/seed.json`) | none | made by the team | Apache 2.0 | The demo journey for four crew members and four blood measures. Laboratory reference ranges in the file are the ranges reported in OSD-569 | SYNTHETIC values; real ranges |

Notes: the app shows four analytes from the file: haemoglobin, haematocrit, red blood cell count and white blood cell count. OSD-569 has no in-flight draws. Timepoints are L-92, L-44, L-3 (days before launch) and R+1, R+45, R+82, R+194 (days after return).
