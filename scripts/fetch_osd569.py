#!/usr/bin/env python3
"""Fetch the Inspiration4 complete blood count table from NASA OSDR (OSD-569, file LSDS-7)
and write the subset the app shows to src/data/osd569_cbc.json.

Data: NASA Open Science Data Repository, OSD-569.
https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
Run once, before the build. The app never calls NASA at run time.
AI assistance: this script was drafted with Claude Code (see AI_USE.md).
"""
import csv
import io
import json
import sys
import urllib.request
from pathlib import Path

URL = ("https://osdr.nasa.gov/geode-py/ws/studies/OSD-569/download"
       "?source=datamanager&file=LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv")
# Analytes shown in the app: source name -> display name (Australian spelling).
ANALYTES = {
    "HEMOGLOBIN": "Haemoglobin",
    "WHITE BLOOD CELL COUNT": "White blood cell count",
    "RED BLOOD CELL COUNT": "Red blood cell count",
    "HEMATOCRIT": "Haematocrit",
}
ORDER = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"]


def main(out_path):
    raw = urllib.request.urlopen(URL, timeout=60).read().decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(raw)))
    series = {}
    for r in rows:
        name = ANALYTES.get(r["ANALYTE"].strip())
        if not name or r["TEST_DATE"] not in ORDER:
            continue
        key = (r["SUBJECT_ID"], name)
        s = series.setdefault(key, {
            "subject": r["SUBJECT_ID"], "analyte": name, "unit": r["UNITS"],
            "refMin": float(r["RANGE_MIN"]), "refMax": float(r["RANGE_MAX"]), "points": []})
        s["points"].append({"t": r["TEST_DATE"], "value": float(r["VALUE"]),
                            "phase": "pre-flight" if r["TEST_DATE"].startswith("L") else "post-flight"})
    for s in series.values():
        s["points"].sort(key=lambda p: ORDER.index(p["t"]))
    out = {
        "source": "NASA Open Science Data Repository (OSDR), OSD-569, Inspiration4, Complete Blood Count (LSDS-7)",
        "credit": "Data: NASA OSDR, OSD-569",
        "link": "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
        "synthetic": False,
        "note": "Real crew data. Three draws before launch (L-) and four after return (R+). No in-flight draws. "
                "Reference ranges are the laboratory ranges reported in the source file.",
        "timepoints": ORDER,
        "series": sorted(series.values(), key=lambda s: (s["subject"], s["analyte"])),
    }
    Path(out_path).write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {out_path}: {len(out['series'])} series")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "src/data/osd569_cbc.json")
