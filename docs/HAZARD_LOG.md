# Hazard log

| # | Hazard | Effect | Control | Status |
|---|---|---|---|---|
| H-001 | A placeholder threshold is read as clinical advice | A user trusts an unreviewed value | Placeholders are visibly marked, carry no review badge, and are listed in CLINICIAN_REVIEW.md | Open |
| H-002 | Wording reads as a diagnosis | False reassurance or alarm | Assessment wording only; clinicians review every line | Open |
| H-003 | Synthetic data read as real | Loss of trust | SYNTHETIC label on every synthetic card and chart | Open |
| H-004 | Real crew data read as in-flight measurements | Misleading claim | On-screen text states pre-flight and post-flight | Open |
| H-005 | A normal reading raises an alert (false alarm) | Alert fatigue; crew stop trusting the tool | Every raised tier includes "Repeat the reading to confirm" (the first step for amber, the second for red). The result and the case pack say whether a second reading has confirmed it. One reading outside the band is amber; red needs three in a row outside the band (SU-01), or one reading beyond a sourced limit such as the NASA cabin carbon dioxide limit (LM-01). Whether one reading should raise a tier is a clinician decision (CR-12) | Open |
| H-006 | A real change stays inside the band (missed change) | False reassurance | The trend rule (TR-01) flags a slow change even when every reading is inside the band, and the trend chart is always shown beside the tier; the band and trend numbers await clinician review (CR-02, CR-16) | Open |
| H-007 | Crew wait for Earth instead of acting | Delay in care | Gap screen states how long a reply takes and tells the crew to start the steps now | Open |
| H-008 | Earth-mode wording read as clinical guidance for remote patients | Misuse outside the demo | SYNTHETIC label and placeholder note on screen; README states prototype only | Open |
| H-009 | A prompt arrives during a critical operation (for example an EVA) | A check-in distracts the astronaut at a dangerous moment | The prompt scheduler never prompts during a critical operation, holds those check-ins until five minutes after it ends, and re-plans when the task runs late (the demo slips the EVA by 45 minutes) | Open |
| H-010 | Streak rewards hide problems | Crew log good numbers to keep a streak, so real changes go unreported | The streak counts check-ins, never results. "Nothing to report" is a valid one-tap log. The crew goal has no ranking | Open |
| H-011 | Mistrust about who can see the data reduces honest reporting | Crew under-report mood, sleep or symptoms | The "Who sees what" table on the "Privacy and limits" screen states who sees each kind of data. It is a draft policy for the team to confirm (CR-13) | Open |
