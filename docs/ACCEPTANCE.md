# Acceptance tests

One test per Must requirement. Each runs in under 2 minutes.

| Test | Req ID | Steps | Expected | Result (h12) | Result (h24) | Result (h46) |
|------|--------|-------|----------|--------------|--------------|--------------|
| AT-01 | FR-01 | Open the demo region; enter a value; save | Value shown with unit and time | | | |
| AT-02 | FR-02 | Save a reading; open the result | Chart shows baseline band, new point, change in words | | | |
| AT-03 | FR-03 | Save one test reading per tier | Each shows the right colour, shape and word | | | |
| AT-04 | FR-04 | Open any result | Why line, named source and confidence visible; badge only on signed-off rules | | | |
| AT-05 | FR-05 | Open a result in each tier | At least one numbered step in every tier | | | |
| AT-06 | FR-06 | Send a Crew medic case | Countdown runs; meanwhile steps listed | | | |
| AT-07 | FR-07 | Tap the demo region on the body figure | Reading screen opens | | | |
| AT-08 | SR-01 | Remove the source from one rule; reload | App refuses the rule and says why | | | |
| AT-09 | DR-01 | Open the real crew data view; pick a crew member and analyte | Band and points drawn; "Data: NASA OSDR, OSD-569" on screen | | | |
| AT-10 | DR-02 | Walk every demo screen | SYNTHETIC label on each synthetic card; unit on every number | | | |
| AT-11 | NFR-01 | Load once; disable network; reload; run the demo story | Story completes | | | |
| AT-12 | PR-01 | Run the quick judge check; open the URL in a private window | No gate errors; app loads with no sign-in | | | |
