#!/usr/bin/env python3
"""Fetch recent solar energetic particle (SEP) events from NASA DONKI and write them to
src/data/donki_sep.json. Run once, before the build. The app never calls NASA at run time.

Data: NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information),
Community Coordinated Modeling Center (CCMC), NASA Goddard Space Flight Center.
https://ccmc.gsfc.nasa.gov/tools/DONKI/
AI assistance: this script was drafted with Claude Code (see AI_USE.md).
"""
import datetime as dt
import json
import sys
import urllib.request
from pathlib import Path

API = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate={a}&endDate={b}"
WINDOW_DAYS = 55   # the API refuses ranges over 60 days
WINDOWS = 7        # about one year back


def main(out_path):
    end = dt.date.today()
    events = {}
    for _ in range(WINDOWS):
        start = end - dt.timedelta(days=WINDOW_DAYS)
        raw = urllib.request.urlopen(API.format(a=start, b=end), timeout=60).read().decode("utf-8").strip()
        for e in (json.loads(raw) if raw else []):
            events[e["sepID"]] = {
                "id": e["sepID"],
                "time": e["eventTime"],
                "instruments": [i["displayName"] for i in e.get("instruments") or []],
                "link": e.get("link"),
            }
        end = start
    ordered = sorted(events.values(), key=lambda e: e["time"], reverse=True)
    out = {
        "source": "NASA DONKI, Community Coordinated Modeling Center (CCMC), NASA Goddard Space Flight Center",
        "credit": "Data: NASA DONKI",
        "link": "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
        "synthetic": False,
        "fetched": dt.date.today().isoformat(),
        "note": "Real solar energetic particle events recorded by spacecraft near Earth. Bundled at build time.",
        "periodDays": WINDOW_DAYS * WINDOWS,
        "recordsInPeriod": len(ordered),
        "eventDaysInPeriod": len({e["time"][:10] for e in ordered}),
        "events": ordered[:12],
    }
    Path(out_path).write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out_path}: {len(ordered)} events found, {len(out['events'])} kept")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "src/data/donki_sep.json")
