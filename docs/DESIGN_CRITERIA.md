# Design criteria: NASA's published standards for crew displays

The app's colours, type, layout and alerts follow NASA's human-factors criteria for crew displays. This file lists each criterion, where it comes from, and whether the app meets it.

This is NASA's guidance on how a crew display should behave. It is not NASA branding. The app uses no NASA logo, insignia or identity, and NASA does not endorse this project. Meeting these criteria in a browser is our own assessment by inspection and measurement; it is not a NASA verification.

## Sources

- **NASA-STD-3001 Volume 2, Revision F** (NASA Space Flight Human-System Standard, Human Factors, Habitability and Environmental Health), section 10 "Crew Interfaces" and Appendix F "Display Standard". Read on 14 Nov 2026 at https://standards.nasa.gov/ . Appendix F states that it covers laptops and tablets. Requirement numbers are shown as [V2 nnnnn]; Appendix F items are cited by paragraph.
- **Human Integration Design Handbook**, NASA/SP-2010-3407, Revision 1, chapter 10. Read on 14 Nov 2026.
- **NASA Ames Research Center, "Using Color in Information Display Graphics"** (Color Usage Research Lab). The live site no longer resolves; archived copies from 2023 and 2024 were read at web.archive.org on 14 Nov 2026.

## Colour

| # | Criterion | Source | How the app meets it | Status |
|---|---|---|---|---|
| D-01 | Colour is used to carry meaning, not for decoration | Appendix F.5.10a; Ames guidance | Backgrounds, cards, charts, links and the SYNTHETIC label are neutral. Colour appears only with the meanings below | Met |
| D-02 | Red means the highest alert level or warning | Appendix F Table F.5-1; [V2 10114] | Red is used only for the Urgent tier | Met |
| D-03 | Yellow means caution or attention required | Table F.5-1 | Yellow is used only for the Crew medic tier | Met |
| D-04 | Blue means advisory | Table F.5-1 | Blue marks advisories, such as the reaction test the tool asks for | Met |
| D-05 | Cyan means missing or stale data | Table F.5-1; [V2 10020] | A value carried over from an earlier day is marked in cyan with the day it came from | Met |
| D-06 | Grey means unavailable or unselectable | Table F.5-1 | Disabled buttons are grey | Met |
| D-07 | Dark green background for things that can be commanded; bright green for navigation and cursor outlines; magenta for procedures | Appendix F Table F.5-2 (recommended) | Buttons have a dark green background; the current page, selection and keyboard focus have a bright green outline; procedure step numbers are magenta | Met |
| D-08 | Green is kept for a good or safe state | [V2 10201] Table 10.4-3; Ames guidance | The Self-manage tier is green. See deviation 2 | Met with a note |
| D-09 | Give an additional cue whenever colour carries meaning | [V2 10045]; Appendix F.5.10e | Every tier is colour plus shape plus word. Arrows, the advisory diamond and stale-data wording back up their colours | Met |
| D-10 | Text contrast of 6:1 or better, 10:1 preferred | Appendix F.5.10f | Every text and background pairing measures 7:1 or better in both themes; body text measures above 13:1 | Met |
| D-11 | Keep the number of colours small | Handbook 10.9.2.5.1 (nine at most, counting black and white); Ames guidance (six for labelling) | Six hues carry meaning: red, yellow, green, blue, cyan, magenta | Met |
| D-12 | Neutral backgrounds; separate layers by lightness, not hue | Ames guidance | Backgrounds are neutral greys in three lightness steps | Met |
| D-13 | Avoid saturated blue for text | Ames guidance | The advisory blue is a pale blue on dark and a dark blue on light | Met |
| D-14 | Reverse video is kept for events that need immediate attention | Appendix F.5.10g | Used once: the "tap now" panel of the reaction test | Met |
| D-15 | Flashing is kept for events that need immediate attention | Appendix F.5.11 | Nothing flashes | Met |

## Text

| # | Criterion | Source | How the app meets it | Status |
|---|---|---|---|---|
| D-16 | Capital letter height of at least 0.25 degrees, 0.4 preferred | Appendix F.5.1g | Smallest text is 16 px (12 point) and body text 18 px. At a 50 cm viewing distance and a nominal screen that is about 0.33 and 0.38 degrees. Our arithmetic, not NASA's. 16 px also meets the 12 point minimum of the ISS Display and Graphics Commonality Standard (SSP 50313). Charts are drawn at their real width, so chart text is 16 px on every device | Met by analysis |
| D-17 | Sans serif font | Appendix F.5.1b | IBM Plex Sans | Met |
| D-18 | Fixed-width font for numbers and tables | Appendix F.5.1d | Every reading, time and count is in IBM Plex Mono | Met |
| D-19 | Mixed case for text that is not an acronym | Appendix F.5.1h | All labels are mixed case. See deviation 1 | Met with one deviation |
| D-20 | Units on every value; a leading zero before a decimal point | [V2 10046]; Appendix F.5.6 | Every value carries its unit; decimals show a leading zero | Met |
| D-21 | Simple, common wording; abbreviations used sparingly | Handbook 10.6 | Plain language throughout; "EVA" is the only abbreviation on screen | Met |

## Layout and controls

| # | Criterion | Source | How the app meets it | Status |
|---|---|---|---|---|
| D-22 | A fixed area that is always visible for time and alerts | Appendix F.4.2f | A bar stays at the top of every screen with mission time and the alert that most needs attention | Met |
| D-23 | Time shown as label dddd/hh:mm:ss on a 24-hour clock | Appendix F.6.1f | "Mission time 0214/06:45:00" | Met |
| D-24 | Consistent appearance and layout | [V2 10005] | One set of components and tokens across all screens | Met |
| D-25 | Critical information in the most prominent place | [V2 10032] | The combined alert card sits at the top of the day; the alert bar is always visible | Met |
| D-26 | Avoid horizontal scrolling; vertical scrolling for lists and procedures | Appendix F.4.1 | No horizontal scrolling at any width. The Today screen is a vertical list of cards | Partly met: Today is long |
| D-27 | Touch targets at least 9.5 mm with 3.2 mm between them | Handbook figure 10.4-18 | Controls are at least 36 px high (about 9.5 mm on a nominal screen) with 12 px between them | Met by analysis |
| D-28 | A control changes appearance when pressed; feedback within 0.1 s | Appendix F.5.4c; [V2 10022] | Every control brightens on press; all responses are local and immediate | Met |
| D-29 | A reading that has crossed a caution or warning limit is followed by a yellow or red arrow | Appendix F.4.3.1d | An up or down arrow in the tier colour follows the value | Met |

## Alerts

| # | Criterion | Source | How the app meets it | Status |
|---|---|---|---|---|
| D-30 | An alert says what is wrong and what can be done | Appendix F.4.3.3c | Every alert has a plain "Why this alert?" and numbered steps | Met |
| D-31 | Alerts link to their procedure; steps can be marked as done | Appendix F.6.3, F.6.4h | Numbered steps on the alert; tick boxes while waiting for Earth | Met |
| D-32 | The highest-priority alert is shown until acknowledged | [V2 10175] | The alert bar shows the most serious alert with an Acknowledge button | Met |
| D-33 | Automated advice gives its reasoning | Appendix F.6.2g | Each result names the rules that fired, with their source | Met |
| D-34 | Suppress, inhibit and enable each alert; one action to silence all | Appendix F.6.4i, F.6.4k | Not built. Alerts can be acknowledged only | Not met |
| D-35 | Avoid nuisance alerts | NASA alerts workshop material, 2024 | One reading asks for a retest before anything stronger; results are marked unconfirmed until a second reading agrees. Rule numbers await clinician review | Partly met |

## Brevity and glanceability (added after clinician review, 14 Nov 2026)

The team's clinicians reviewed the screens and found them far too wordy for a crew member at work. These criteria were added, and the screens were rebuilt to them.

| # | Criterion | Source | How the app meets it | Status |
|---|---|---|---|---|
| D-36 | The interface keeps cognitive workload acceptable | NASA-STD-3001 Volume 2 Rev F [V2 5007], Cognitive Workload (Bedford Workload Scale) | Each screen has one job. Today shows only what needs the crew member. Not measured on a workload scale: that needs real users | Partly met: not measured |
| D-37 | The crew member can assess the situation rapidly and accurately | NASA-STD-3001 Volume 2 Rev F section 5.1.6, Situation Awareness | Today opens on one status mark: a shape, a colour and a count. Each thing that needs attention is one tile. What is fine is not listed | Met by inspection |
| D-38 | Simple instructions, because astronauts are not assumed to be medical experts; a visual tool | NASA Space Apps 2026 challenge statement, considerations and objectives | Steps are short and numbered. The body figure is the centre of Today. Reasons, sources and fine print are one tap away behind a "Why" control | Met |
| D-39 | A word budget per screen, counted on the live app | Our own measure, set after the clinicians' review | Today 116 to 143 words on one tablet screen, down from 991 words on five screens. Result about 200 words. Pathway about 215 words. Budgets: Today 150, any working screen 260 | Met for Today, results, pathway and wait screens. The Menu and check-in screens are over budget |
| D-40 | Detail is never removed, only deferred | The project's own rules: every threshold shows its source; placeholders are marked | Every "Why" control holds the reason, the rule, its source and the placeholder note. The word "Placeholder" and the SYNTHETIC label stay visible | Met |

## Deviations and limits

1. **The word SYNTHETIC stays in capitals.** The challenge rules and our own data rules require synthetic data to be labelled, and our submission check looks for that exact word. It is not an acronym, so this departs from D-19. It carries no colour.
2. **Green has two roles.** The standard recommends dark green behind controls and bright green for navigation outlines, and also uses green for a good state. The Ames guidance would keep green for safety status alone. We follow the current standard. The Self-manage tier always has a circle and its word, so it is not confused with a button.
3. **Sizes are checked by arithmetic.** Character height and target size depend on the device and viewing distance. We assumed a tablet at 50 cm. Charts shrink on a phone, where their labels fall below the preferred size.
4. **Our tiers are not NASA's alert classes.** NASA defines emergency, warning, caution and advisory for vehicle systems. We map Urgent to warning red and Crew medic to caution yellow, and use blue for advisories. Self-manage is a good-state green. Tier meanings await clinician review.
5. **Not covered:** display brightness, glare, operation in gloves, and voice or sensor input. These depend on hardware we do not have.
6. **The team's earlier design system** used cyan for actions and a violet SYNTHETIC label. Both changed here, because the standard reserves cyan for stale data and magenta for procedures.
