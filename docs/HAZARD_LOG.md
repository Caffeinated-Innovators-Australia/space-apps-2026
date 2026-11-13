# Hazard log

| # | Hazard | Effect | Control | Status |
|---|---|---|---|---|
| H-001 | A placeholder threshold is read as clinical advice | A user trusts an unreviewed value | Placeholders are visibly marked, carry no review badge, and are listed in CLINICIAN_REVIEW.md | Open |
| H-002 | Wording reads as a diagnosis | False reassurance or alarm | Assessment wording only; clinicians review every line | Open |
| H-003 | Synthetic data read as real | Loss of trust | SYNTHETIC label on every synthetic card and chart | Open |
| H-004 | Real crew data read as in-flight measurements | Misleading claim | On-screen text states pre-flight and post-flight | Open |
| H-005 | A normal reading raises an alert (false alarm) | Alert fatigue; crew stop trusting the tool | First step of every raised tier is "Repeat the reading to confirm". The result and the case pack say whether a second reading has confirmed it. Band width comes from measured within-person variation. Requiring a second reading before a tier is raised is a clinician decision (CR-12) | Open |
| H-006 | A real change stays inside the band (missed change) | False reassurance | Trend is always shown beside the tier; the band method awaits clinician review (CR-02) | Open |
| H-007 | Crew wait for Earth instead of acting | Delay in care | Gap screen states how long a reply takes and tells the crew to start the steps now | Open |
| H-008 | Earth-mode wording read as clinical guidance for remote patients | Misuse outside the demo | SYNTHETIC label and placeholder note on screen; README states prototype only | Open |
