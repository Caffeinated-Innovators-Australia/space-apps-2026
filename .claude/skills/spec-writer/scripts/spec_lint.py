#!/usr/bin/env python3
"""spec_lint.py: check docs/REQUIREMENTS.md against the challenge traceability table and the judging rubric.

Generic tooling: contains no project content. Stdlib + optional PyYAML (for the rubric).

Usage:
  python spec_lint.py --requirements docs/REQUIREMENTS.md \
      [--challenge docs/CHALLENGE.md] [--rubric evals/rubric.yaml] \
      [--stage draft|h12|h24|h36|h46] [--json out.json]

Exit code: 0 = no errors, 1 = errors found, 2 = bad input.
"""
import argparse
import json
import re
import sys
from pathlib import Path

PRIORITIES = {"must", "should", "could", "won't", "wont"}
STATUSES = {"todo", "building", "done", "verified", "cut"}
GATES = {"pending", "passed", "failed", "n/a", "na", ""}
ID_RE = re.compile(r"^(FR|NFR|DR|SR|PR)-\d{2,3}$")
PLACEHOLDER_RE = re.compile(r"<[^>]*>|\bTBD\b|\bTODO\b|\?\?", re.I)
STAGES = ["draft", "h12", "h24", "h36", "h46"]


HEADER_MAP = [  # (canonical, predicate on normalised header)
    ("id", lambda h: h in ("id", "req id", "req", "requirement id", "req. id", "#") or h.endswith(" id")),
    ("priority", lambda h: h.startswith("prior") or h in ("moscow", "pri")),
    ("acceptance criteria", lambda h: "acceptance" in h or h in ("ac", "test")),
    ("traces", lambda h: h.startswith("trace") or "challenge" in h),
    ("evals", lambda h: h.startswith("eval") or "judg" in h or "rubric" in h or "criteri" in h),
    ("gate", lambda h: "gate" in h or "safety" in h),
    ("owner", lambda h: h.startswith("owner") or h == "who"),
    ("status", lambda h: h.startswith("status") or h == "state"),
    ("requirement", lambda h: h.startswith("requirement") or h in ("description", "the system shall")),
]


def canon_header(h):
    h = re.sub(r"[*_`]", "", h).strip().lower()
    for name, pred in HEADER_MAP:
        if pred(h):
            return name
    return h


def clean(cell):
    """Strip markdown emphasis/code, curly quotes and trailing punctuation from a cell or id."""
    c = (cell or "").replace("\u2019", "'").replace("\u2018", "'")
    return re.sub(r"[*_`]", "", c).strip()


def split_row(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", line)]


def parse_tables(text):
    """Yield (headers, rows) for each GitHub-style markdown table. rows are dicts keyed by lower-case header."""
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|?\s*:?-{2,}", lines[i + 1].strip()):
            raw_headers = split_row(line)
            headers = []
            for h in raw_headers:  # canonicalise, but keep first occurrence only
                c = canon_header(h)
                headers.append(c if c not in headers else h.strip().lower())
            rows = []
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = split_row(lines[i])
                cells += [""] * (len(headers) - len(cells))
                rows.append(dict(zip(headers, cells)))
                i += 1
            yield headers, rows
        else:
            i += 1


def split_ids(cell, lower=False):
    out = [clean(t).strip(":.") for t in re.split(r"[,;/\s]+", clean(cell)) if clean(t).strip(":.")]
    return [o.lower() for o in out] if lower else out


def load_requirements(path):
    reqs = []
    for headers, rows in parse_tables(Path(path).read_text(encoding="utf-8")):
        if "id" in headers and "priority" in headers:
            for r in rows:
                if r.get("id"):
                    reqs.append(r)
    return reqs


def load_challenge_rows(path, row_pattern):
    """Return {row_id: description} from any table in CHALLENGE.md whose first cell matches row_pattern."""
    rx = re.compile(row_pattern)
    found = {}
    text = Path(path).read_text(encoding="utf-8")
    for headers, rows in parse_tables(text):
        for r in rows:
            for k, v in r.items():  # the ID may sit in any column; take the first cell that is an ID
                cand = clean(v).rstrip(":.").replace("-", "") if re.fullmatch(r"[A-Za-z]{1,3}-\d+", clean(v).rstrip(":.")) else clean(v).rstrip(":.")
                if rx.match(cand):
                    found[cand] = " | ".join(x for kk, x in r.items() if kk != k)[:120]
                    break
    return found


def load_rubric_ids(path):
    text = Path(path).read_text(encoding="utf-8")
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(text)
    except ImportError:
        data = json.loads(text)
    return {c["id"]: c for c in data.get("criteria", [])}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--requirements", required=True)
    ap.add_argument("--challenge")
    ap.add_argument("--rubric")
    ap.add_argument("--stage", default="draft", choices=STAGES)
    ap.add_argument("--must-rows", default=r"^(R|Q|U)\d+$",
                    help="regex for challenge rows that MUST be traced (default R*, Q*, U*)")
    ap.add_argument("--all-rows", default=r"^[A-Z]{1,3}\d+$", help="regex for any traceability row id")
    ap.add_argument("--max-musts", type=int, default=12)
    ap.add_argument("--json")
    a = ap.parse_args()

    if not Path(a.requirements).exists():
        print(f"ERROR: {a.requirements} not found", file=sys.stderr)
        return 2
    reqs = load_requirements(a.requirements)
    errors, warnings = [], []
    E = errors.append
    W = warnings.append
    stage_ix = STAGES.index(a.stage)

    if not reqs:
        E("No requirement tables found (need a markdown table with ID and Priority columns).")
    elif not any("acceptance criteria" in r for r in reqs):
        E("Requirement table has no Acceptance criteria column (header must contain 'acceptance').")

    seen = set()
    musts = []
    for r in reqs:
        rid = clean(r.get("id", ""))
        pr = clean(r.get("priority", "")).lower()
        st = clean(r.get("status", "")).lower()
        gate = clean(r.get("gate", "")).lower()
        if PLACEHOLDER_RE.search(rid) or rid.startswith("<"):
            continue  # template example row left in
        if not ID_RE.match(rid):
            E(f"{rid}: ID must look like FR-01 / NFR-01 / DR-01 / SR-01 / PR-01")
        if rid in seen:
            E(f"{rid}: duplicate ID")
        seen.add(rid)
        if pr not in PRIORITIES:
            E(f"{rid}: priority '{r.get('priority')}' not Must/Should/Could/Won't")
        if st and st not in STATUSES:
            W(f"{rid}: unknown status '{st}'")
        if not st and stage_ix >= STAGES.index("h12"):
            E(f"{rid}: empty Status (use todo/building/done/verified/cut)")
        if gate not in GATES:
            W(f"{rid}: unknown gate '{gate}'")
        is_must = pr == "must"
        if is_must:
            musts.append(r)
            ac = r.get("acceptance criteria", "")
            if not ac or PLACEHOLDER_RE.search(ac):
                E(f"{rid}: Must has missing/placeholder acceptance criteria")
            if PLACEHOLDER_RE.search(r.get("requirement", "")):
                E(f"{rid}: Must requirement text still has a placeholder")
            if not split_ids(r.get("traces", "")):
                E(f"{rid}: Must does not trace to any challenge row")
            if not split_ids(r.get("evals", "")):
                W(f"{rid}: Must is not mapped to any judging criterion")
            if not r.get("owner") or PLACEHOLDER_RE.search(r.get("owner", "")):
                (E if stage_ix >= STAGES.index("h12") else W)(f"{rid}: Must has no owner")
        if rid.startswith("SR-") and gate in ("", "n/a", "na"):
            E(f"{rid}: safety/clinical requirement must have Gate pending/passed/failed")
        # stage-specific strictness
        if is_must and st != "cut":
            if stage_ix >= STAGES.index("h24") and rid.startswith("SR-") and gate != "passed":
                E(f"{rid}: at {a.stage} clinical Must has not passed the safety gate: cut it from the demo or get it reviewed")
            if stage_ix >= STAGES.index("h24") and st in ("todo", ""):
                E(f"{rid}: at {a.stage} a Must is still 'todo' (scope frozen): build it or cut it")
            if STAGES.index("h36") <= stage_ix < STAGES.index("h46") and st not in ("done", "verified"):
                E(f"{rid}: at {a.stage} every live Must should be 'done' (pitch assets need it) (is '{st}')")
            if stage_ix >= STAGES.index("h46") and st != "verified":
                E(f"{rid}: at code freeze every Must must be 'verified' or 'cut' (is '{st}')")
        if gate == "failed" and st not in ("cut",):
            E(f"{rid}: failed safety gate but not cut")

    if len(musts) > a.max_musts:
        W(f"{len(musts)} Must requirements (> {a.max_musts}); a 48 h build rarely ships that many. Demote some.")

    # traceability coverage
    traced = {}
    for r in reqs:
        if clean(r.get("priority", "")).lower() in ("won't", "wont") or clean(r.get("status", "")).lower() == "cut":
            continue
        for t in split_ids(r.get("traces", "")):
            traced.setdefault(t, []).append(r.get("id"))
    coverage = {}
    if a.challenge:
        if not Path(a.challenge).exists():
            E(f"{a.challenge} not found")
        else:
            rows = load_challenge_rows(a.challenge, a.all_rows)
            req_text = Path(a.requirements).read_text(encoding="utf-8")
            if not rows:
                E("No traceability rows found in CHALLENGE.md (expected table rows starting R1, Q1, U1, C1 …)")
            must_rx = re.compile(a.must_rows)
            for row_id in rows:
                coverage[row_id] = traced.get(row_id, [])
                if must_rx.match(row_id) and not coverage[row_id]:
                    if re.search(rf"\b{re.escape(row_id)}\b\W{{0,4}}not addressed", req_text, re.I):
                        W(f"Challenge {row_id}: explicitly not addressed (make sure judges won't penalise this)")
                    else:
                        E(f"Challenge {row_id} is not traced by any live requirement: {rows[row_id]}")
            unknown = sorted(set(traced) - set(rows))
            for u in unknown:
                W(f"Trace '{u}' (used by {', '.join(traced[u])}) is not a row in CHALLENGE.md")

    # rubric coverage
    if a.rubric:
        if not Path(a.rubric).exists():
            E(f"{a.rubric} not found")
        else:
            crit = load_rubric_ids(a.rubric)
            used = {}
            for r in reqs:
                for e in split_ids(r.get("evals", ""), lower=True):
                    used.setdefault(e, []).append(r.get("id"))
                    if e not in crit:
                        E(f"{r.get('id')}: eval '{e}' is not a criterion id in the rubric ({', '.join(crit)})")
            for cid, c in crit.items():
                if c.get("weight", 0) and not any(
                    clean(rr.get("priority", "")).lower() == "must" for rr in reqs if cid in split_ids(rr.get("evals", ""), lower=True)):
                    W(f"Judging criterion '{cid}' has no Must requirement driving it")

    result = {
        "stage": a.stage,
        "requirements": len([r for r in reqs if ID_RE.match(r.get('id', ''))]),
        "musts": len(musts),
        "musts_verified": sum(1 for r in musts if r.get("status", "").lower() == "verified"),
        "errors": errors,
        "warnings": warnings,
        "coverage": coverage,
        "pass": not errors,
    }
    print(f"spec_lint [{a.stage}]: {result['requirements']} requirements, {result['musts']} Must "
          f"({result['musts_verified']} verified)")
    for e in errors:
        print(f"  ERROR   {e}")
    for w in warnings:
        print(f"  WARNING {w}")
    print("RESULT:", "PASS" if result["pass"] else f"FAIL ({len(errors)} errors)")
    if a.json:
        Path(a.json).write_text(json.dumps(result, indent=2), encoding="utf-8")
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
