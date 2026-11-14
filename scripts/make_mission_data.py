#!/usr/bin/env python3
"""Build the demo mission: four crew, fifteen indicators across the main spaceflight health areas, a pre-flight baseline and 86 mission days,
plus the fixed configuration (indicators, environments, crew timeline, privacy).

Writes src/data/seed.json. Everything about the crew is SYNTHETIC: made up, labelled, and
seeded so the file is the same every run. Two things come from real NASA data:
  * haemoglobin variation and laboratory ranges, from NASA OSDR OSD-569 (src/data/osd569_cbc.json)
  * the days that carry a radiation prompt, from NASA DONKI solar particle events (src/data/donki_sep.json)
The cabin CO2 limit is NASA's published one-hour limit (NASA-STD-3001 Volume 2). The strength floor (80% of
baseline) and the career radiation limit (600 mSv) are from NASA-STD-3001 Volume 1.
AI assistance: this script was drafted with Claude Code (see AI_USE.md).
"""
import datetime as dt
import json
import random
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rng = random.Random(2026)
MISSION_DAY = 87
MISSION_START = dt.date(2026, 11, 14) - dt.timedelta(days=MISSION_DAY - 1)
osd = json.loads((ROOT / "src/data/osd569_cbc.json").read_text())
donki = json.loads((ROOT / "src/data/donki_sep.json").read_text())

DRAFT = "Draft wording, drawn from the team's challenge brief where it covers the topic, awaiting clinician sign-off (CR-03, CR-23)"
HAZARDS = {"R": "Radiation", "I": "Isolation and confinement", "D": "Distance from Earth", "G": "Gravity fields", "E": "Hostile or closed environment"}

INDICATORS = [
    {"id": "sleep", "group": "Mind and sleep", "name": "Sleep", "region": "Sleep", "unit": "h", "dp": 1, "watch": "low", "cadence": "daily", "slot": "morning",
     "input": {"kind": "number", "min": 0, "max": 24, "prompt": "Hours slept last night"},
     "hazards": ["I", "E"],
     "card": {"how": "Enter the hours you slept last night, to the nearest half hour. Count sleep, not time in the sleep station.",
              "why": "Sleep and body-clock disruption is one of the risks of long missions. A slow slide over weeks is easy to miss from the inside.",
              "what": "If your sleep is below your own range, or drifting down, the tool asks for a quick reaction-time check and tells you who to talk to."}},
    {"id": "resting-hr", "group": "Heart", "name": "Resting heart rate", "region": "Heart", "unit": "bpm", "dp": 0, "watch": "both", "cadence": "daily", "slot": "morning",
     "input": {"kind": "number", "min": 20, "max": 250, "prompt": "Resting heart rate"},
     "hazards": ["G"],
     "card": {"how": "Measure soon after waking, before exercise. Stay still for five minutes first, then count for a full minute or use the wrist sensor.",
              "why": "The heart and blood vessels adapt to changed gravity. A resting rate that moves away from your own normal is an early signal.",
              "what": "One odd reading: rest and repeat it. If it stays outside your range, tell your crew medic."}},
    {"id": "mood", "group": "Mind and sleep", "name": "Mood", "region": "Mind", "unit": "of 5", "dp": 0, "watch": "low", "cadence": "daily", "slot": "evening",
     "input": {"kind": "scale", "min": 1, "max": 5, "prompt": "How are you today?", "labels": ["Very low", "Low", "OK", "Good", "Very good"]},
     "hazards": ["I", "D"],
     "card": {"how": "Pick the word that fits how you feel right now. There is no right answer, and the first one that comes to mind is usually the true one.",
              "why": "Isolation and confinement wear on everyone. An honest daily check-in shows a trend long before it shows in your work.",
              "what": "A low day is logged and nothing more. A run of low days is shared with your crew medic, and only with them."}},
    {"id": "reaction", "group": "Mind and sleep", "name": "Reaction time", "region": "Mind", "unit": "ms", "dp": 0, "watch": "high", "cadence": "prompted", "slot": "any",
     "input": {"kind": "test", "min": 100, "max": 2000, "prompt": "Reaction test: five taps"},
     "hazards": ["E", "I"],
     "card": {"how": "Hold the tablet steady. When the panel turns bright, tap it as fast as you can. Five rounds, about thirty seconds.",
              "why": "Poor sleep and raised cabin carbon dioxide both slow thinking. A short reaction test shows it when you may not feel it.",
              "what": "If you are slower than your own range, rest and repeat. If it holds, hand over safety-critical tasks and tell your crew medic."}},
    {"id": "cabin-co2", "environment": True, "group": "Cabin and radiation", "name": "Cabin carbon dioxide", "region": "Cabin", "unit": "mmHg", "dp": 1, "watch": "high", "cadence": "sensor", "slot": "any",
     "baselineLabel": "First two weeks of the mission",
     "input": {"kind": "sensor", "min": 0, "max": 20, "prompt": "Cabin sensor, one-hour average"},
     # The cabin is an environment problem before it is a medical one, so the air system comes first (CR-19).
     "steps": {"amber": ["Tell the commander so the air system can be checked.", "Confirm with a second sensor.", "Do a reaction-time check."],
               "red": ["Tell the commander now so the air system can be checked.", "Confirm with a second sensor.", "Do a reaction-time check, and tell your crew medic if you have a headache.", "Send the case to Earth."]},
     "limit": {"high": 3.0, "label": "NASA cabin limit", "source": "NASA-STD-3001 Volume 2: one-hour average cabin carbon dioxide of 3 mmHg or less", "grade": "A"},
     "hazards": ["E"],
     "card": {"how": "Read automatically from the cabin sensor as a one-hour average. You can also type a reading from a handheld monitor.",
              "why": "Cabin carbon dioxide is linked to headaches and slower thinking. It builds up in a closed habitat.",
              "what": "Above the cabin limit: tell the commander so the air system can be checked, and do a reaction-time check."}},
    {"id": "bp-sys", "group": "Heart", "name": "Blood pressure, upper", "region": "Heart", "unit": "mmHg", "dp": 0, "watch": "both", "cadence": "weekly", "weekDay": 1, "slot": "morning",
     "input": {"kind": "number", "min": 50, "max": 260, "prompt": "Upper (systolic) blood pressure"},
     "hazards": ["G"],
     "card": {"how": "Sit and rest for five minutes. Put the cuff on your upper arm at heart level. Stay still and quiet while it measures.",
              "why": "The heart and blood vessels adapt to changed gravity, and blood pressure shifts with them. Good technique matters: a rushed reading gives a false alarm.",
              "what": "One odd reading: rest five minutes and repeat it. If it stays outside your range, tell your crew medic."}},
    {"id": "bp-dia", "group": "Heart", "name": "Blood pressure, lower", "region": "Heart", "unit": "mmHg", "dp": 0, "watch": "both", "cadence": "weekly", "weekDay": 1, "slot": "morning",
     "input": {"kind": "number", "min": 30, "max": 160, "prompt": "Lower (diastolic) blood pressure"},
     "hazards": ["G"],
     "card": {"how": "Take it from the same reading as the upper number: seated, rested five minutes, cuff at heart level.",
              "why": "The two blood pressure numbers are read together. A change in either away from your own normal is worth a second look.",
              "what": "One odd reading: rest five minutes and repeat it. If it stays outside your range, tell your crew medic."}},
    {"id": "vision", "group": "Eyes", "name": "Near vision", "region": "Eyes", "unit": "lines", "dp": 0, "watch": "low", "cadence": "weekly", "weekDay": 3, "slot": "morning",
     "input": {"kind": "vision", "min": 0, "max": 8, "prompt": "Near-vision check: one eye at a time"},
     "hazards": ["G"],
     "card": {"how": "Hold the screen at arm's length with your usual glasses on. Cover one eye and read the smallest line you can, then swap eyes. The tool keeps the worse eye.",
              "why": "Changes to the eye and vision are a risk particular to spaceflight, linked to fluid shifting towards the head. A weekly self-check against your own earlier results shows a change early.",
              "what": "If you read fewer lines than your own range, repeat the check in good light. If it holds, tell your crew medic so a proper eye exam can be arranged."},
     "cardNote": "This is not a calibrated eye chart and is not a test for any eye condition. It only compares you with your own earlier results on this device."},
    {"id": "exercise", "group": "Muscle and bone", "name": "Exercise plan done", "region": "Muscle and bone", "unit": "%", "dp": 0, "watch": "low", "cadence": "daily", "slot": "evening",
     "input": {"kind": "number", "min": 0, "max": 200, "prompt": "How much of today's exercise plan did you do?"},
     "hazards": ["G"],
     "card": {"how": "At the end of the day, enter how much of the planned exercise you completed, as a percentage. A missed session is 0, a full day is 100.",
              "why": "Muscle and bone are lost quickly in reduced gravity. Exercise is the main protection, so sticking to the plan is itself a health signal.",
              "what": "A missed day is logged and nothing more. If sessions keep slipping, talk to your crew medic about what is getting in the way."}},
    {"id": "grip", "group": "Muscle and bone", "name": "Grip strength", "region": "Muscle and bone", "unit": "kg", "dp": 1, "watch": "low", "cadence": "weekly", "weekDay": 5, "slot": "morning",
     "input": {"kind": "number", "min": 1, "max": 120, "prompt": "Grip strength, stronger hand"},
     "limit": {"lowFraction": 0.8, "label": "NASA strength standard (80% of your baseline)", "source": "NASA-STD-3001 Volume 1: in-mission skeletal muscle strength at or above 80% of baseline", "grade": "A"},
     "hazards": ["G"],
     "card": {"how": "Use the hand dynamometer with your stronger hand, elbow at your side. Squeeze as hard as you can for three seconds. Take the best of three.",
              "why": "Grip strength is a quick stand-in for overall muscle strength, which falls in reduced gravity. There is no direct way to measure bone in flight, so strength and exercise stand in for it.",
              "what": "Below your own range: check your exercise plan is being met. Below 80% of your baseline: tell your crew medic."}},
    {"id": "body-mass", "group": "Muscle and bone", "name": "Body mass", "region": "Muscle and bone", "unit": "kg", "dp": 1, "watch": "low", "cadence": "weekly", "weekDay": 5, "slot": "morning",
     "input": {"kind": "number", "min": 30, "max": 200, "prompt": "Body mass"},
     "hazards": ["G", "E"],
     "card": {"how": "Use the body mass device before breakfast, once a week, in the same clothing.",
              "why": "Crews tend to lose body mass on long missions, often because they eat less than they need. A slow fall is easy to miss week to week.",
              "what": "Below your own range, or drifting down: check your food and fluid logs, and tell your crew medic if it continues."}},
    {"id": "fluid", "group": "Food and fluid", "name": "Fluid intake", "region": "Food and fluid", "unit": "L", "dp": 1, "watch": "low", "cadence": "daily", "slot": "evening",
     "input": {"kind": "number", "min": 0, "max": 12, "prompt": "Fluid you drank today"},
     "hazards": ["E", "D"],
     "card": {"how": "At the end of the day, add up what you drank, in litres. Count water, drinks and soups.",
              "why": "Staying hydrated protects thinking, exercise performance and the kidneys. Thirst is a poor guide in spaceflight.",
              "what": "A low day: drink before you sleep. A run of low days: tell your crew medic."}},
    {"id": "energy", "group": "Food and fluid", "name": "Food energy", "region": "Food and fluid", "unit": "kcal", "dp": 0, "watch": "low", "cadence": "daily", "slot": "evening",
     "input": {"kind": "number", "min": 0, "max": 9000, "prompt": "Food energy you ate today"},
     "hazards": ["D", "E"],
     "card": {"how": "At the end of the day, enter the energy total from the meal packs you ate, in kilocalories. The pack labels carry the numbers.",
              "why": "Eating less than you need is a known problem on long missions and drives loss of body mass. Every meal has to be carried, so nothing can be made up later.",
              "what": "A low day: eat the next planned meal in full. A run of low days: tell your crew medic."}},
    {"id": "radiation", "group": "Cabin and radiation", "name": "Radiation dose", "region": "Radiation", "unit": "mSv", "dp": 1, "watch": "high", "cadence": "sensor", "slot": "any", "mode": "cumulative",
     "input": {"kind": "sensor", "min": 0, "max": 5000, "prompt": "Personal dosimeter, mission total"},
     "limit": {"high": 600, "label": "NASA career limit", "source": "NASA-STD-3001 Volume 1: career effective dose from spaceflight below 600 mSv", "grade": "A"},
     "hazards": ["R"],
     "card": {"how": "Read the running total from your personal dosimeter. It can only go up.",
              "why": "Radiation is one of the five hazards of spaceflight. Dose adds up over a career, so the total matters more than any one day.",
              "what": "The tool shows how much of the career limit you have used. After a solar particle event, log the reading so the flight surgeon can see the step."}},
    {"id": "haemoglobin", "group": "Blood", "name": "Haemoglobin", "region": "Blood", "unit": "g/dL", "dp": 1, "watch": "both", "cadence": "weekly", "weekDay": 0, "slot": "morning",
     "input": {"kind": "number", "min": 3, "max": 25, "prompt": "Haemoglobin from the blood analyser"},
     "ref": {"M": {"min": 13.2, "max": 17.1}, "F": {"min": 11.7, "max": 15.5}},
     "refSource": "Laboratory reference range as reported in NASA OSDR, OSD-569 (LSDS-7)",
     "fixedSd": osd["variation"]["Haemoglobin"]["pooledSd"],
     "variationSource": "Within-person variation of pre-flight draws in NASA OSDR, OSD-569 (four crew, three draws each)",
     "hazards": ["G", "R"],
     "card": {"how": "Use the blood analyser with a fingertip sample, once a week, at the same time of day.",
              "why": "Blood changes in spaceflight. Each person's normal is different, which the real crew data in this tool shows.",
              "what": "Outside your own range: repeat the test. Outside the laboratory range as well: tell your crew medic."}},
]
GROUP_ORDER = ["Mind and sleep", "Heart", "Eyes", "Muscle and bone", "Food and fluid", "Blood", "Cabin and radiation"]
INDICATORS.sort(key=lambda i: GROUP_ORDER.index(i["group"]))
for i in INDICATORS:
    i["card"]["status"] = DRAFT
    i["card"]["sources"] = [{"label": "NASA Human Research Program, 5 Hazards of Human Spaceflight", "url": "https://www.nasa.gov/hrp/hazards/"},
                            {"label": "NASA Human Research Program, Risks of Human Spaceflight", "url": "https://www.nasa.gov/hrp/risks/"}]

# name, sex (only to pick the laboratory range), and each person's own normal: mean and day-to-day spread
CREW = [
    ("crew-1", "Crew member 1", "F", {"sleep": (7.2, 0.42), "resting-hr": (58, 2.6), "mood": (4.1, 0.55), "reaction": (262, 13), "haemoglobin": (13.2, 0.2), "bp-sys": (112, 4), "bp-dia": (70, 3), "vision": (7, 0), "exercise": (96, 6), "grip": (31.0, 1.2), "body-mass": (62.0, 0.4), "fluid": (2.4, 0.25), "energy": (2350, 160)}),
    ("crew-2", "Crew member 2", "M", {"sleep": (6.9, 0.45), "resting-hr": (64, 3.0), "mood": (3.9, 0.6), "reaction": (275, 15), "haemoglobin": (14.7, 0.2), "bp-sys": (121, 5), "bp-dia": (78, 4), "vision": (7, 0), "exercise": (94, 7), "grip": (46.0, 1.6), "body-mass": (81.5, 0.5), "fluid": (2.7, 0.3), "energy": (2900, 190)}),
    ("crew-3", "Crew member 3", "M", {"sleep": (7.4, 0.40), "resting-hr": (55, 2.4), "mood": (4.2, 0.5), "reaction": (255, 12), "haemoglobin": (16.5, 0.2), "bp-sys": (118, 4), "bp-dia": (74, 3), "vision": (7, 0), "exercise": (98, 5), "grip": (49.0, 1.5), "body-mass": (84.0, 0.5), "fluid": (2.9, 0.3), "energy": (3000, 180)}),
    ("crew-4", "Crew member 4", "F", {"sleep": (7.0, 0.48), "resting-hr": (61, 2.8), "mood": (4.0, 0.6), "reaction": (270, 14), "haemoglobin": (12.3, 0.2), "bp-sys": (108, 4), "bp-dia": (68, 3), "vision": (7, 0), "exercise": (95, 6), "grip": (29.0, 1.1), "body-mass": (58.5, 0.4), "fluid": (2.3, 0.25), "energy": (2250, 150)}),
]
DP = {i["id"]: i["dp"] for i in INDICATORS}
BY_ID = {i["id"]: i for i in INDICATORS}
DAYS = MISSION_DAY - 1  # days 1 to 86 are history; day 87 is today


def clip(ind, v):
    if ind == "mood":
        return float(min(5, max(1, round(v))))
    return round(v, DP[ind])


def draw(ind, mean, sd, n):
    return [clip(ind, rng.gauss(mean, sd)) for _ in range(n)]


# The cabin is shared, so every crew member sees the same series.
co2_base = [clip("cabin-co2", rng.gauss(2.2, 0.17)) for _ in range(14)]
co2 = co2_base + [clip("cabin-co2", rng.gauss(2.2, 0.17)) for _ in range(DAYS - 14)]
co2[-7:] = [2.3, 2.4, 2.3, 2.5, 2.4, 2.6, 2.6]  # the story: creeping up over the past week

crew_out = []
for cid, name, sex, normal in CREW:
    baseline, mission = {}, {}
    for ind, (mean, sd) in normal.items():
        spec = BY_ID[ind]
        if ind == "vision":
            # Whole lines read on the near-vision check. Mostly steady, one line better now and then.
            baseline[ind] = [7.0, 8.0, 7.0, 6.0]
            mission[ind] = [float(rng.choice([7, 7, 7, 8])) if d % 7 == spec["weekDay"] else None for d in range(1, DAYS + 1)]
            continue
        if spec["cadence"] == "weekly":
            baseline[ind] = draw(ind, mean, sd, 3 if ind == "haemoglobin" else 4)
            mission[ind] = [clip(ind, rng.gauss(mean, sd)) if d % 7 == spec["weekDay"] else None for d in range(1, DAYS + 1)]
            continue
        baseline[ind] = draw(ind, mean, sd, 14)
        series = draw(ind, mean, sd, DAYS)
        if ind == "reaction":  # prompted, not daily: about one day in six
            series = [v if rng.random() < 0.17 else None for v in series]
        elif cid != "crew-1":  # the odd missed check-in
            series = [None if rng.random() < 0.04 else v for v in series]
        mission[ind] = series
    if cid == "crew-1":
        # The story for the demo: sleep slides over three weeks, each night still inside the personal band.
        b = statistics.mean(baseline["sleep"])
        slide = [0.05, 0.1, 0.1, 0.2, 0.15, 0.25, 0.3, 0.3, 0.4, 0.35, 0.45, 0.5, 0.45, 0.55, 0.6, 0.6, 0.65, 0.7, 0.65, 0.75, 0.75]
        mission["sleep"][-21:] = [round(b - s, 1) for s in slide]
        for k in ("sleep", "exercise", "fluid", "energy"):
            mission[k][66] = None  # one missed evening and morning, three weeks back
        mission["reaction"][-9] = 259.0
        mission["reaction"][-3] = 271.0
        mission["mood"][-5:] = [4.0, 4.0, 3.0, 4.0, 4.0]
    if cid == "crew-2":
        # A second story, for the kidney stone pathway: fluid intake drifts down over the past week.
        b = statistics.mean(baseline["fluid"])
        mission["fluid"][-7:] = [round(b - d, 1) for d in (0.3, 0.4, 0.4, 0.5, 0.5, 0.6, 0.6)]
    total, dose = 0.0, []
    for _ in range(DAYS):
        total += max(0.4, rng.gauss(0.66, 0.05))
        dose.append(round(total, 1))
    baseline["radiation"] = []
    mission["radiation"] = dose
    baseline["cabin-co2"] = co2_base
    mission["cabin-co2"] = co2
    crew_out.append({"id": cid, "name": name, "sex": sex, "baseline": baseline, "mission": mission})

# Days that carry a radiation prompt: real DONKI solar particle events inside the mission window.
event_days = sorted({(dt.date.fromisoformat(e["time"][:10]) - MISSION_START).days + 1 for e in donki["events"]})
event_days = [d for d in event_days if 1 <= d <= MISSION_DAY]

seed = {
    "synthetic": True,
    "note": "SYNTHETIC. Every crew value in this file was made up by the team for the demo and generated by scripts/make_mission_data.py. No real person. The haemoglobin variation and laboratory ranges come from NASA OSDR OSD-569; the cabin carbon dioxide limit is NASA's published one-hour limit (NASA-STD-3001 Volume 2); the strength floor and the career radiation limit are from NASA-STD-3001 Volume 1; radiation prompt days come from NASA DONKI.",
    "missionDay": MISSION_DAY,
    "missionStart": MISSION_START.isoformat(),
    "hazards": HAZARDS,
    "indicators": INDICATORS,
    "crew": crew_out,
    "today": {"crew-1": {"sleep": 6.2, "resting-hr": 59, "mood": 4, "reaction": 318, "cabin-co2": 3.4, "haemoglobin": 13.1, "vision": 7, "exercise": 90, "fluid": 2.3, "energy": 2300, "bp-sys": 113, "bp-dia": 71, "grip": 30.6, "body-mass": 61.7}},
    "settings": [
        {"id": "mars-base", "label": "Mars base", "kicker": "Mars surface base · Mission day 87", "replySeconds": 2676,
         "gapLabel": "Earth reply possible in", "nowLabel": "Earth reply possible now", "detail": "One-way delay 22 min 18 s, with Mars at its farthest",
         "basis": "Light-time arithmetic: about 401 million km at the speed of light, there and back. Relay and processing time would add to this.",
         "advice": "No one on Earth can answer for about 45 minutes. Start the steps now. Do not wait.", "scenarioSynthetic": False,
         "risks": "Partial gravity, dust, long-term radiation, behavioural health", "twist": "Months of trend data; a reply takes 6 to 45 minutes"},
        {"id": "transit", "label": "In transit", "kicker": "Spacecraft in transit to Mars · Mission day 87", "replySeconds": 364,
         "gapLabel": "Earth reply possible in", "nowLabel": "Earth reply possible now", "detail": "One-way delay 3 min 2 s, at Mars-closest distance",
         "basis": "Light-time arithmetic: about 54.6 million km at the speed of light, there and back. The delay grows as the spacecraft travels.",
         "advice": "No one on Earth can answer for about 6 minutes. Start the steps now.", "scenarioSynthetic": False,
         "risks": "Radiation, isolation, confinement", "twist": "The delay grows every day, so the crew must act on its own"},
        {"id": "moon", "label": "Moon base", "kicker": "Lunar surface base · Mission day 87", "replySeconds": 2.6,
         "gapLabel": "Earth reply possible in", "nowLabel": "Earth can answer now", "detail": "One-way delay 1.3 s",
         "basis": "Light-time arithmetic: about 384,400 km at the speed of light, there and back.",
         "advice": "Earth can answer within seconds. Call the flight surgeon and do the steps together.", "scenarioSynthetic": False,
         "risks": "Partial gravity, dust, radiation", "twist": "Ground support within seconds"},
        {"id": "station", "label": "Space station", "kicker": "Space station, low Earth orbit · Mission day 87", "replySeconds": 0.5,
         "gapLabel": "Earth reply possible in", "nowLabel": "Earth can answer now", "detail": "Real-time link while in coverage",
         "basis": "In low Earth orbit the signal delay is a fraction of a second.",
         "advice": "Ground support is in real time. Call the flight surgeon now.", "scenarioSynthetic": False,
         "risks": "Bone and muscle loss, eye changes, carbon dioxide, sleep", "twist": "Ground support is in real time"},
        {"id": "earth", "label": "Remote Australia", "kicker": "Very remote Australia · 7 hours by road from hospital", "replySeconds": 3600,
         "gapLabel": "Retrieval team can reach you in", "nowLabel": "Retrieval team can reach you now", "detail": "Nearest hospital: 7 hours by road",
         "basis": "SYNTHETIC scenario for a very remote property: an aeromedical retrieval one hour away.",
         "advice": "A doctor can talk you through this by phone now. Hands-on help is an hour away. Start the steps.", "scenarioSynthetic": True,
         "risks": "Distance from care, heat, isolation", "twist": "A doctor by phone now; hands-on help an hour away",
         "words": {"your crew medic": "your remote area nurse", "the commander": "the station manager", "Earth": "the on-call doctor", "pre-flight": "usual", "Before launch": "Before this season", "This mission": "This season", "cabin": "room"},
         "tierWords": {"amber": "Remote nurse"}},
    ],
    "settingStatus": "Draft guidance lines, environment profiles and Earth-mode wording, awaiting clinician review (CR-11). The rules do not yet change by environment; that is a clinician decision.",
    # A mock crew day. Critical operations never carry a prompt.
    "timeline": [
        {"start": "06:30", "end": "07:15", "label": "Wake and breakfast", "critical": False},
        {"start": "07:15", "end": "08:00", "label": "Daily planning call", "critical": False},
        {"start": "08:00", "end": "12:00", "label": "EVA: surface traverse", "critical": True},
        {"start": "12:00", "end": "13:00", "label": "Suit doffing and lunch", "critical": False},
        {"start": "13:00", "end": "15:30", "label": "Greenhouse and lab work", "critical": False},
        {"start": "15:30", "end": "17:00", "label": "Exercise", "critical": False},
        {"start": "17:00", "end": "19:00", "label": "Habitat maintenance", "critical": False},
        {"start": "19:00", "end": "21:00", "label": "Dinner and crew time", "critical": False},
        {"start": "21:00", "end": "22:00", "label": "Wind down", "critical": False},
    ],
    "clockOptions": ["06:45", "09:30", "12:10", "21:10"],
    "slipMinutes": 45,
    "radiationDays": event_days,
    "symptoms": {"status": "Placeholder list, awaiting clinician review (CR-10)", "options": ["Headache", "Tired", "Dizzy on standing", "Nauseous", "Blurred vision", "Rash", "Fever or chills", "Sore throat", "Cut slow to heal", "Low mood", "Pain in side or lower back", "Blood in urine", "Pain passing urine", "Cannot pass urine"]},
    "radiationPrompt": {"status": "Placeholder step, awaiting clinician review (CR-09)", "step": "Log your personal dosimeter reading."},
    "privacy": {
        "status": "Draft policy for the team to confirm (CR-13)",
        "rows": [
            {"what": "Your readings and trends", "you": "Always", "medic": "Only what you send, or a confirmed Urgent result", "surgeon": "Only the cases you send", "crew": "Never"},
            {"what": "Mood and symptom logs", "you": "Always", "medic": "Only a run of low days, or what you send", "surgeon": "Only the cases you send", "crew": "Never"},
            {"what": "Check-in streak and crew goal", "you": "Always", "medic": "Totals only", "surgeon": "Totals only", "crew": "Crew total only, never who"},
            {"what": "Cabin carbon dioxide", "you": "Always", "medic": "Always", "surgeon": "Always", "crew": "Always: it is the shared cabin"},
        ],
    },
    "problem": {
        "space": {"text": "NASA names distance from Earth as one of the five hazards of human spaceflight: medical care becomes “increasingly challenging to receive from Earth”.", "source": "NASA Human Research Program, 5 Hazards of Human Spaceflight", "link": "https://www.nasa.gov/hrp/hazards/"},
        "earth": {"text": "In very remote Australia, potentially avoidable deaths run at 252 per 100,000 people, against 88 in major cities (2022 to 2024, age-standardised).", "source": "Australian Institute of Health and Welfare, Deaths in Australia", "link": "https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area"},
    },
    "earthBenefit": {"figure": "252 vs 88", "text": "potentially avoidable deaths per 100,000 people in very remote Australia compared with major cities (2022 to 2024, age-standardised).", "source": "Australian Institute of Health and Welfare, Deaths in Australia", "link": "https://www.aihw.gov.au/reports/life-expectancy-deaths/deaths-in-australia/contents/variations-between-population-groups/remoteness-area"},
}
(ROOT / "src/data/seed.json").write_text(json.dumps(seed, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
c1 = crew_out[0]
print("wrote src/data/seed.json; radiation prompt days:", event_days)
print("crew-1 sleep baseline mean %.2f sd %.2f; last 7: %s" % (statistics.mean(c1["baseline"]["sleep"]), statistics.stdev(c1["baseline"]["sleep"]), c1["mission"]["sleep"][-7:]))
print("co2 baseline mean %.2f sd %.2f; last 7: %s" % (statistics.mean(co2_base), statistics.stdev(co2_base), co2[-7:]))
print("crew-1 reaction baseline mean %.1f sd %.1f" % (statistics.mean(c1["baseline"]["reaction"]), statistics.stdev(c1["baseline"]["reaction"])))
print("crew-1 mood baseline mean %.2f sd %.2f" % (statistics.mean(c1["baseline"]["mood"]), statistics.stdev(c1["baseline"]["mood"])))
