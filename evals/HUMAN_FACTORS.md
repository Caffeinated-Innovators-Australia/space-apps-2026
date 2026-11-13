# Human-factors principles and persona calibration

From research/astronaut_human_factors.md. Judges (Presentation, Validity) and the human-factors and astronaut persona agents use this.

## Ten evidence-based design principles

1. **Quiet when normal (dark cockpit).** The default screen is calm, with no green "all OK" clutter. A normal state means nothing demands attention. *([LEI](https://www.lean.org/the-lean-post/articles/the-dark-cockpit-what-aviation-can-teach-lean-leaders/); [FAA HF guide](https://hfcc.dot.gov/publications/docs/GeneralGuidance/zz_FAA_GeneralGuidanceDoc_Chapter_04_Section_01.html))*
2. **No alert without a required action.** Every alert names what to do. Conditions that need no awareness get logged for the weekly PMC, not alerted. *([FAA HF guide](https://hfcc.dot.gov/publications/docs/GeneralGuidance/zz_FAA_GeneralGuidanceDoc_Chapter_04_Section_01.html); [14 CFR 25.1322(d)](https://www.law.cornell.edu/cfr/text/14/25.1322))*
3. **A fixed, small hierarchy that maps to urgency.** Use three tiers (Red = Warning, immediate action; Amber = Caution, CMO review; Advisory or log = self-manage), consistent in colour, wording and sound. This mirrors 25.1322 and the ISS Emergency, Warning, Caution and Advisory scheme. *([14 CFR 25.1322](https://www.law.cornell.edu/cfr/text/14/25.1322); [ESA](https://blogs.esa.int/tim-peake/?p=945))*
4. **Treat false alerts as a safety defect, not an annoyance.** Set a nuisance-alert budget. Require repeat measurement or sustained change before Amber, because false alerts erode trust and can provoke the wrong action. *([Federal Register 2009](https://www.govinfo.gov/content/pkg/FR-2009-07-09/pdf/E9-16277.pdf); [Becker's/Joint Commission](https://www.beckersasc.com/uncategorized/joint-commission-issues-alert-on-medical-device-alarm-safety/))*
5. **Show alert confidence.** Display why it fired and how reliable it is. Showing validity information sharply reduced cry-wolf non-response. *([Ergonomics 2014](https://informahealthcare.com/doi/abs/10.1080/00140139.2014.957732); [Bliss 1995](https://stars.library.ucf.edu/scopus1990/1980))*
6. **Expect context and suppress noise.** Use known adaptation windows (SAS days 1–3, high cabin CO2, post-exercise) to re-label expected changes instead of alarming. *([NASA NTRS SAS](https://ntrs.nasa.gov/citations/19850012345); [Kelly CO2 via AP](https://phys.org/news/2017-10-astronaut-memoir-blunt-year-space.pdf))*
7. **Design the Red state for tunnel vision.** One dominant instruction, large targets, sequential steps and nothing competing on screen. Stressed users fixate on one item. *([Wickens 2005](https://corescholar.libraries.wright.edu/isap_2005/121); [HFES 2016](https://journals.sagepub.com/doi/10.1177/1541931213601068))*
8. **Budget workload and measure it.** Aim for check-ins of 30 seconds or less, and run Raw NASA-TLX in usability tests at the event. The ISS schedule already allows only about 6 h of sleep. *([Hart 2006](https://humansystems.arc.nasa.gov/publications/HFES_2006_Paper.pdf); [Barger 2014](https://www.technologynetworks.com/neuroscience/news/ten-year-study-highlights-sleep-deficiency-and-sleep-medication-use-astronauts-282474))*
9. **Pair self-report with objective proxies and personal baselines.** People miss their own slow drift, and individuals vary widely. Compare each person with their own baseline and flag disagreement between what they report and what is measured. *([WHYY/Mars-500](https://whyy.org/articles/psychological-hazards-of-exploration-lessons-from-a-mock-mars-mission/); [Sci Am/Basner](https://www.scientificamerican.com/blog/basic-space/what-a-fake-mars-mission-says-about-our-own-sleep-habits/))*
10. **Make honest reporting safe.** Data is private by default, controlled by the astronaut, and shared with the flight surgeon only. Frame it as "keeps you flying" (early catch), not a fitness-for-duty test. Fear of grounding drives avoidance. *([NASA OCHMO TB-014](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-014-behavioral-health-mishaps.pdf); [AAN pilot study](https://www.aan.com/MSA/Public/Events/AbstractDetails/54241); [Space.com/Barratt](https://www.space.com/nasa-spacex-crew-8-astronaut-health-issue-privacy-concerns))*

## 5. Calibration notes for persona agents

### astronaut-commander (veteran)
- Expects privacy as standard practice. Will reject any feature that shows a crewmate's health or mood to the rest of the crew, consistent with Barratt's "medical privacy is very important to us" stance ([Space.com](https://www.space.com/nasa-spacex-crew-8-astronaut-health-issue-privacy-concerns)).
- Has lived with dust-triggered false fire alarms. Respects alarms that are rare and rehearsed, and has no patience for nuisance health alerts competing with real C&W ([NASA blog](https://www.nasa.gov/blogs/spacestation/2018/05/17/captains-log-alarms); [Fed Reg 2009](https://www.govinfo.gov/content/pkg/FR-2009-07-09/pdf/E9-16277.pdf)).
- Thinks about crew readiness. Wants an aggregate signal such as "crew sleep debt is rising" without names, knowing that sleep loss hurts cohesion and performance ([HERA/Entrepreneur](https://www.entrepreneur.com/article/297557); [Barger 2014](https://sleepreviewmag.com/sleep-health/parameters/quantity/astronaut-sleep-hypnotics/)).
- Judges tools by schedule cost. Every minute comes out of a timeline already short on sleep (6.09 h average on ISS).
- Would back the tool if it shortens the weekly PMC by arriving pre-packaged, rather than adding a new ritual.

### astronaut-rookie (first flight)
- Eager to comply and anxious about being the one who gets sick. Over-reports early on, then risks alert fatigue by week 3.
- Will very likely have SAS on days 1–3 (about 48–50%), and should get "this is expected" guidance, not a Red alert ([NASA NTRS](https://ntrs.nasa.gov/citations/19850012345); [Peake/KCL](https://www.kcl.ac.uk/archive/news/lsm/newsrecords/2016/feb/astronaut-tim-peake-talks-to-kings-students-from-space)).
- As a stand-in CMO, has only tens of hours of medical training (15–70 h by source). Needs plain-language, step-by-step prompts ([NASA AsMA 2021](https://ntrs.nasa.gov/api/citations/20205008925/downloads/AsMA%202021%20Abstract%20CMO%20Training_PubPress_DAA_v1.docx)).
- Fear drops with knowledge and a clear next action (Hadfield, TED). Will value "why this check" cards.
- Probably still believes that self-report captures everything. Mars-500 shows it won't notice slow drift ([WHYY](https://whyy.org/articles/psychological-hazards-of-exploration-lessons-from-a-mock-mars-mission/)).

### astronaut-underreporter (downplays symptoms)
- Main motive: protecting future flight assignments. Echoes IOM testimony, NASA's admission of "reluctance … to report", and the 56% pilot avoidance rate ([NASA OCHMO](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-014-behavioral-health-mishaps.pdf); [AAN](https://www.aan.com/MSA/Public/Events/AbstractDetails/54241)).
- Pattern: holds symptoms until after the mission or landing (the Zarya 2000 precedent, [Flight International](https://flightglobal.com/zarya-iss-module-made-us-crew-ill/27951.article)). Answers "fine" to free-text mood prompts and will skip any optional question.
- Most likely to stay quiet about mood, sleep medication use (75% of ISS crew used it) and minor neuro or visual symptoms. Least likely to hide visible problems such as rashes.
- Will engage if the tool is clearly *pro-flying* ("catch it early and keep your seat"), shares only with the flight surgeon, and gives objective data they can't easily spin, like actigraphy or the trend from their own baseline.
- Stress test: ask "would this data ever reach the assignment board?" The answer must be no, in writing, on screen.

### bystander-crewmate (untrained rescuer)
- A sudden event "completely out of the blue" in an otherwise healthy crewmate is realistic (Fincke, 2026). Response came from crewmates within seconds, with flight surgeons joining remotely ([AP/WTOP](https://wtop.com/national/2026/03/he-suddenly-couldnt-speak-in-space-nasa-astronaut-says-his-medical-scare-remains-a-mystery)).
- Under acute stress, attention tunnels. Needs one instruction at a time, big targets and no reading ([Wickens 2005](https://corescholar.libraries.wright.edu/isap_2005/121)).
- Will skip anything that looks like a form. Data capture must never delay action (team ground rule 5).
- Expects the familiar ISS alarm vocabulary (red emergency, distinctive tone, a few named classes). Health emergency UI should match that pattern, not invent a new one ([ESA](https://blogs.esa.int/tim-peake/?p=945)).

### human-factors (reviewer)
- Apply the 10 principles in section 3.2 as a checklist. Fail any alert that has no required action (25.1322(d); FAA HF guide).
- Require a nuisance-alert estimate per rule. Cite the cry-wolf evidence: at validity of 0.5 or lower, most users start ignoring alerts ([Ergonomics 2014](https://informahealthcare.com/doi/abs/10.1080/00140139.2014.957732)).
- Run Raw NASA-TLX on the demo flows during the FRRs. Check-in target: 30 seconds or less ([Hart 2006](https://humansystems.arc.nasa.gov/publications/HFES_2006_Paper.pdf)).
- Challenge gamification proposals with TRIPPA and Etkin. Allow progress feedback and "what you learned" framing, but no crew leaderboards.
- Flag any reliance on the "third-quarter phenomenon" as weakly supported ([Polar Record meta-analysis](https://www-cambridge-org.ezproxyberklee.flo.org/core/journals/polar-record/article/timedependent-mood-fluctuations-in-antarctic-personnel-a-metaanalysis/C821DE633ED36CEEC2FD8FFE96024E9F)).

