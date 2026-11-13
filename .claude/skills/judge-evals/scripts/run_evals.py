#!/usr/bin/env python3
"""run_evals.py: continuous judging harness for Space Apps builds.

Generic tooling: contains no project content. Stdlib + PyYAML.

Three steps, run in order at each checkpoint (hours 12, 24, 36, 46) or any time:

  1. auto     deterministic checks on the repo (gates + rule hygiene)
       python run_evals.py auto --repo . --rubric evals/rubric.yaml --out evals/runs/<tag>
  2. prompts  write one judge prompt per (criterion x judge persona) for the main session to
              dispatch to judge-simulator / reviewer agents IN PARALLEL
       python run_evals.py prompts --rubric evals/rubric.yaml --out evals/runs/<tag>
     Each agent must save its JSON answer to evals/runs/<tag>/judge/<criterion>__<persona>.json
  3. score    merge auto + judge results into a scorecard, compare with the previous run, rank fixes
       python run_evals.py score --rubric evals/rubric.yaml --out evals/runs/<tag>

Exit code of `score`: 0 when all gates pass and the weighted score >= rubric.meta.target_score, else 1.
"""
import argparse
import datetime as dt
import json
import re
import statistics
import subprocess
import sys
import zipfile
from pathlib import Path

import yaml

TEXT_EXT = {".md", ".txt", ".html", ".htm", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".py",
            ".json", ".yaml", ".yml", ".css", ".csv"}
UI_EXT = {".html", ".htm", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"}
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".next", ".claude",
             "evals"}
US_SPELLINGS = {
    r"\bcolor(s|ed|ing)?\b": "colour", r"\bcenter(s|ed)?\b": "centre", r"\banalyz(e|es|ed|ing)\b": "analyse",
    r"\borganiz(e|es|ed|ing|ation)\b": "organise", r"\bbehavior(s|al)?\b": "behaviour",
    r"\bfavorite(s)?\b": "favourite", r"\bprioritiz(e|es|ed|ing)\b": "prioritise", r"\bpersonaliz(e|ed|ation)\b": "personalise",
    r"\bvisualiz(e|ed|ation)\b": "visualise", r"\bdefense\b": "defence", r"\bliter(s)?\b": "litre",
    r"\banemia\b": "anaemia", r"\bpediatric\b": "paediatric", r"\bhemoglobin\b": "haemoglobin",
}
SECRET_RE = re.compile(r"(sk-[A-Za-z0-9_\-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_\-]{35}|"
                       r"-----BEGIN (RSA |EC )?PRIVATE KEY-----)")
PLACEHOLDER_UI_RE = re.compile(r"lorem ipsum|TODO|FIXME|XXX|placeholder text", re.I)
URL_RE = re.compile(r"https?://[^\s)\]>\"']+")


# ------------------------------------------------------------------ helpers
def cell(x):
    return str(x).replace("|", "\\|").replace("\n", " ")


def load_rubric(path):
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


def iter_files(repo, exts=None):
    for p in Path(repo).rglob("*"):
        if p.is_file() and not any(part in SKIP_DIRS for part in p.relative_to(repo).parts):
            if exts is None or p.suffix.lower() in exts:
                if p.stat().st_size < 2_000_000:
                    yield p


def read(p):
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def find_first(repo, names):
    for n in names:
        for p in Path(repo).glob(n):
            if p.is_file():
                return p
    return None


def check(cid, ok, detail, severity="error", evidence=None):
    return {"id": cid, "pass": bool(ok), "severity": severity, "detail": detail, "evidence": evidence or []}


# ------------------------------------------------------------------ auto checks
def auto_checks(repo, rubric):
    repo = Path(repo)
    cfg = rubric.get("auto_config", {})
    results = []
    readme = find_first(repo, ["README.md", "readme.md", "README*"])
    readme_txt = read(readme) if readme else ""
    docs_txt = readme_txt + "\n".join(read(p) for p in (repo / "docs").glob("*.md")) if (repo / "docs").exists() else readme_txt

    # A1 README exists and is substantive
    results.append(check("A1_readme", readme and len(readme_txt.split()) >= 150,
                         f"README {'found' if readme else 'missing'} ({len(readme_txt.split())} words; need >= 150)"))

    # A2 datasets cited: name + link, and space-agency data used
    urls = URL_RE.findall(docs_txt)
    agency_domains = cfg.get("agency_domains", ["nasa.gov", "esa.int", "asc-csa.gc.ca", "jaxa.jp", "isro.gov.in",
                                                "space.gov.au", "cnes.fr", "inpe.br", "conae.gov.ar", "dlr.de",
                                                "kari.re.kr", "uksa", "osdr.nasa.gov", "earthdata.nasa.gov"])
    agency = sorted({u for u in urls if any(d in u for d in agency_domains)})
    results.append(check("A2_agency_data", agency, f"{len(agency)} space-agency data/resource links cited in README/docs",
                         evidence=agency[:10]))
    dd = find_first(repo, ["docs/DATA_DICTIONARY.md", "DATA_DICTIONARY.md"])
    dd_txt = read(dd) if dd else ""
    results.append(check("A3_data_dictionary", dd and len(URL_RE.findall(dd_txt)) >= 1,
                         "Data dictionary present with source links" if dd else "docs/DATA_DICTIONARY.md missing"))

    # A4 synthetic labelling
    synth_files = [str(p.relative_to(repo)) for p in iter_files(repo) if "synth" in p.name.lower()]
    uses_synth = bool(synth_files) or re.search(r"\bsynthetic\b", dd_txt + readme_txt, re.I)
    if uses_synth:
        ui_label_hits = [str(p.relative_to(repo)) for p in iter_files(repo, UI_EXT) if "SYNTHETIC" in read(p)]
        readme_label = bool(re.search(r"synthetic", readme_txt, re.I))
        results.append(check("A4_synthetic_labelled", ui_label_hits and readme_label,
                             f"Synthetic data used; UI files with 'SYNTHETIC' label: {len(ui_label_hits)}; README mentions it: {readme_label}",
                             evidence=ui_label_hits[:10] + synth_files[:5]))
    else:
        results.append(check("A4_synthetic_labelled", True, "No synthetic data detected", severity="info"))

    # A5 AI-use disclosure
    ai_disc = re.search(r"(use of (ai|artificial intelligence)|ai (tools?|disclosure|assistance)|generative ai|"
                        r"claude|chatgpt|copilot|llm)", readme_txt, re.I)
    results.append(check("A5_ai_disclosure", ai_disc, "README discloses AI tool use" if ai_disc
                         else "No AI-use disclosure found in README (check this year's rules)"))

    # A6 no pre-kickoff project commits
    kickoff = cfg.get("kickoff_utc")
    in_git = subprocess.run(["git", "-C", str(repo), "rev-parse", "--is-inside-work-tree"],
                            capture_output=True, text=True).stdout.strip() == "true"
    if kickoff and in_git:
        try:
            out = subprocess.run(["git", "-C", str(repo), "log", "--reverse", "--format=%cI|%s", "--", "."],
                                 capture_output=True, text=True, timeout=30).stdout.splitlines()
            ko = dt.datetime.fromisoformat(kickoff.replace("Z", "+00:00"))
            early = []
            allowed = re.compile(cfg.get("pre_kickoff_allowed_paths_regex",
                                         r"^(\.claude/|evals/|CLAUDE\.md|DRY_RUN|LICEN[CS]E|README_BENCH|\.gitignore)"))
            for line in out:
                ts, _, msg = line.partition("|")
                if dt.datetime.fromisoformat(ts) < ko:
                    early.append(f"{ts} {msg}")
            # list files changed before kickoff outside allowed tooling paths
            bad = []
            if early:
                files = subprocess.run(["git", "-C", str(repo), "log", f"--before={kickoff}", "--name-only",
                                        "--format=", "--", "."], capture_output=True, text=True, timeout=30).stdout.split()
                top = subprocess.run(["git", "-C", str(repo), "rev-parse", "--show-prefix"], capture_output=True,
                                     text=True).stdout.strip()
                files = [f[len(top):] if top and f.startswith(top) else f for f in files]
                bad = sorted({f for f in files if f and not allowed.match(f)})
            results.append(check("A6_no_prekickoff_work", not bad,
                                 f"{len(early)} commits before kick-off; non-tooling files touched: {len(bad)}",
                                 evidence=bad[:15]))
        except Exception as e:  # noqa: BLE001
            results.append(check("A6_no_prekickoff_work", True, f"git check skipped: {e}", severity="info"))
    else:
        results.append(check("A6_no_prekickoff_work", True, "Skipped (no kickoff_utc or no git repo)", severity="info"))

    # A7 secrets
    leaks = [str(p.relative_to(repo)) for p in iter_files(repo, TEXT_EXT | {".env"}) if SECRET_RE.search(read(p))]
    results.append(check("A7_no_secrets", not leaks, f"{len(leaks)} files look like they contain API keys", evidence=leaks))

    # A8 unit mixing (mg/dL and mmol/L on one UI file)
    mixed = [str(p.relative_to(repo)) for p in iter_files(repo, UI_EXT)
             if re.search(r"mg/dl", read(p), re.I) and re.search(r"mmol/l", read(p), re.I)]
    results.append(check("A8_units_not_mixed", not mixed, f"{len(mixed)} UI files contain both mg/dL and mmol/L",
                         severity="warning", evidence=mixed))

    # A9 Australian English in UI strings (heuristic: quoted strings / JSX text only)
    us_hits = []
    if cfg.get("australian_english", True):
        for p in iter_files(repo, UI_EXT | {".md"}):
            if p.suffix == ".md" and p.name.upper() not in {"README.MD"}:
                continue
            txt = read(p)
            strings = " ".join(re.findall(r"[\"'`>]([^\"'`<>{}\n]{4,200})[\"'`<]", txt)) if p.suffix in UI_EXT else txt
            strings = re.sub(r"\b(color|background-color|text-align|center)\s*[:=]", " ", strings)  # css props
            for rx, au in US_SPELLINGS.items():
                for m in re.finditer(rx, strings, re.I):
                    us_hits.append(f"{p.relative_to(repo)}: '{m.group(0)}' -> {au}")
    results.append(check("A9_australian_english", len(us_hits) <= cfg.get("us_spelling_tolerance", 3),
                         f"{len(us_hits)} likely US spellings in user-facing text", severity="warning",
                         evidence=us_hits[:15]))

    # A10 placeholder text in UI
    ph = [str(p.relative_to(repo)) for p in iter_files(repo, {".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte"})
          if PLACEHOLDER_UI_RE.search(read(p))]
    results.append(check("A10_no_placeholder_ui", not ph, f"{len(ph)} UI files contain TODO/lorem/placeholder",
                         severity="warning", evidence=ph[:10]))

    # A11 governance logs
    for cid, name, minimum in [("A11_decision_log", "docs/DECISION_LOG.md", 3), ("A12_hazard_log", "docs/HAZARD_LOG.md", 1)]:
        p = repo / name
        lines_ = read(p).splitlines() if p.exists() else []
        table_rows = [l for l in lines_ if l.strip().startswith("|") and not re.match(r"^\s*\|?\s*:?-{2,}", l.strip())]
        n = max(len(table_rows) - 1, 0) if table_rows else 0  # minus header row
        n += len([l for l in lines_ if re.match(r"^\s*(-|\*|\d+\.)\s+\S", l)])
        results.append(check(cid, n >= minimum, f"{name}: {n} entries (need >= {minimum})", severity="warning"))

    # A13 spec lint (if spec-writer present)
    lint = repo / ".claude/skills/spec-writer/scripts/spec_lint.py"
    reqs = repo / "docs/REQUIREMENTS.md"
    if lint.exists() and reqs.exists():
        cmd = [sys.executable, str(lint), "--requirements", str(reqs), "--stage", cfg.get("stage", "draft")]
        if (repo / "docs/CHALLENGE.md").exists():
            cmd += ["--challenge", str(repo / "docs/CHALLENGE.md")]
        rub = repo / "evals/rubric.yaml"
        if rub.exists():
            cmd += ["--rubric", str(rub)]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        detail = (r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip()[-200:]).replace("\n", " ")
        results.append(check("A13_spec_lint", r.returncode == 0, detail,
                             evidence=[l.strip() for l in r.stdout.splitlines() if "ERROR" in l][:10]))
    else:
        results.append(check("A13_spec_lint", False, "docs/REQUIREMENTS.md or spec-writer missing", severity="warning"))

    # A14 submission format limits
    sub = cfg.get("submission", {})
    max_slides = sub.get("max_slides")
    decks = [p for p in iter_files(repo, {".pptx"})]
    if max_slides and decks:
        for d in decks:
            with zipfile.ZipFile(d) as z:
                n = len([n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)])
            results.append(check("A14_slide_limit", n <= max_slides, f"{d.name}: {n} slides (limit {max_slides})",
                                 evidence=[str(d.relative_to(repo))]))
    max_video = sub.get("max_video_seconds")
    vids = [p for p in Path(repo).rglob("*") if p.suffix.lower() in {".mp4", ".mov", ".webm"} and ".git" not in p.parts]
    if max_video and vids:
        for v in vids:
            try:
                secs = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                             "default=nw=1:nk=1", str(v)], capture_output=True, text=True,
                                            timeout=30).stdout.strip())
                results.append(check("A15_video_limit", secs <= max_video, f"{v.name}: {secs:.1f}s (limit {max_video}s)"))
            except Exception:  # noqa: BLE001
                results.append(check("A15_video_limit", True, f"{v.name}: ffprobe unavailable, check manually", severity="info"))

    # A17 open-source licence file (2026 terms: OSI licence, Apache 2.0 default)
    lic = find_first(repo, ["LICENSE", "LICENSE.*", "LICENCE", "LICENCE.*", "COPYING"])
    results.append(check("A17_licence_file", lic, f"Licence file {'found: ' + lic.name if lic else 'missing (2026 terms require open licence)'}"))

    # A18 third-party sources cited (every external URL-bearing dataset/visual listed)
    cat = find_first(repo, ["visuals/CATALOGUE.md"])
    imgs = [p for p in iter_files(repo, {".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp"}) if "node_modules" not in p.parts]
    if imgs:
        results.append(check("A18_visuals_catalogued", cat is not None,
                             f"{len(imgs)} image files; visuals/CATALOGUE.md {'present' if cat else 'missing'}", severity="warning"))

    # A19 overclaims in user-facing text (README, pitch, UI)
    over_rx = re.compile(cfg.get("overclaim_regex",
        r"\b(the first|world'?s first|first ever|clinically (validated|proven|tested)|validated|"
        r"diagnos(e|es|is) (you|the astronaut|your)|replaces? (the )?(doctor|flight surgeon|cmo)|"
        r"nasa[- ](approved|endorsed|certified|integrated)|accuracy of \d+|\d+% accura)"), re.I)
    over_hits = []
    pitch_files = [p for p in iter_files(repo, {".md", ".txt"}) if re.search(r"(pitch|script|slide|storyboard)", str(p.relative_to(repo)), re.I)]
    for p in ([readme] if readme else []) + pitch_files + list(iter_files(repo, UI_EXT)):
        for m in over_rx.finditer(read(p)):
            ctx = read(p)[max(0, m.start() - 30): m.end() + 30].replace("\n", " ")
            if re.search(r"(not|never|no|isn't|is not|without)\W+(\w+\W+){0,3}" + re.escape(m.group(0)), ctx, re.I):
                continue  # negated ("not clinically validated") is the honest version
            over_hits.append(f"{p.relative_to(repo)}: '...{ctx.strip()}...'")
    results.append(check("A19_no_overclaims", not over_hits,
                         f"{len(over_hits)} possible overclaims (see evals/PRIOR_ART.md 'Claims to avoid')",
                         severity="warning", evidence=over_hits[:10]))

    # A20 pitch voice-over word budget (30 s video: ~62-68 words ideal, 80 max)
    budget = cfg.get("submission", {}).get("max_voiceover_words", 80)
    vo_files = [p for p in pitch_files if re.search(r"(script|voice|vo\b|storyboard)", p.name, re.I)]
    for p in vo_files:
        txt = read(p)
        vo = re.findall(r"(?im)^\s*(?:[-*]\s*)?(?:vo|voice-?over|narration)\s*[:|]\s*(.+)$", txt)
        words = len(" ".join(vo).split()) if vo else len(re.sub(r"[#|*>`-]", " ", txt).split())
        results.append(check("A20_voiceover_budget", words <= budget,
                             f"{p.name}: {words} {'voice-over' if vo else 'total'} words (budget {budget}; ~65 ideal for 30 s)",
                             severity="warning"))

    # A21 datasets rated RED in the licence audit must not be used
    red = cfg.get("red_datasets", [])
    if red:
        red_rx = re.compile(r"\b(" + "|".join(re.escape(r) for r in red) + r")\b", re.I)
        red_hits = sorted({f"{p.relative_to(repo)}: {m.group(0)}" for p in iter_files(repo, TEXT_EXT)
                           if not p.name.upper().startswith(("RUBRIC", "PRIOR_ART", "COMPETITOR", "SEED_REQ"))
                           for m in red_rx.finditer(read(p))
                           if not re.search(r"(avoid|not used|excluded|red|rejected)", read(p)[max(0, m.start()-80):m.end()+80], re.I)})
        results.append(check("A21_no_red_datasets", not red_hits,
                             f"{len(red_hits)} references to datasets rated RED for licence (non-commercial / no redistribution)",
                             evidence=red_hits[:10]))

    # A16 demo runnable: start instructions in README
    has_run = re.search(r"(npm (run|start)|yarn|pnpm|python .*\.py|docker|open index\.html|"
                        r"## (run|quick ?start|getting started|setup))", readme_txt, re.I)
    results.append(check("A16_run_instructions", has_run, "README has run / quick-start instructions" if has_run
                         else "README has no run / quick-start instructions", severity="warning"))
    return results


# ------------------------------------------------------------------ judge prompts
PROMPT_TMPL = """You are acting as a NASA Space Apps Challenge judge: {persona_name}.
{persona_brief}

Challenge being judged: **{challenge}**. Repository root: `{repo}`.
Before scoring, read for calibration: {context_files}

Score ONE criterion only: **{name}** (id: `{cid}`, weight {weight}).
Official wording ({source}): "{official}"

What judges look for:
{look_for}

Scoring anchors (use integers 1–5, be strict; 3 = a typical decent hackathon entry):
{anchors}

Red flags that cap the score at 2:
{red_flags}

Evidence you MUST inspect before scoring (read the actual files, run the demo if it is runnable):
{evidence}

Rules for you:
- Judge only what is shown. Plans, roadmaps and intentions score nothing unless the criterion says so.
- Quote file paths / screen names as evidence. No evidence means no credit.
- Judges see the submission for only a few minutes: if something important is hard to find, penalise it.
- Don't edit any files apart from writing your answer.

Write ONLY this JSON to `{outfile}` and also return it as your final message:
{{"criterion": "{cid}", "persona": "{pid}", "score": <1-5>, "confidence": "low|medium|high",
  "evidence": ["<path or observation>", ...], "strengths": ["..."], "gaps": ["..."],
  "top_fix": "<the single change that would raise this score most, doable in under 2 hours>",
  "fix_effort_hours": <number>}}
"""


def write_prompts(rubric, out, repo="."):
    out = Path(out).resolve()
    repo = Path(repo).resolve()
    meta = rubric.get("meta", {})
    ctx = [str(repo / f) for f in meta.get("judge_context_files", ["evals/WINNING_TRAITS.md", "evals/COMPETITOR_ARCHETYPES.md"])
           if (repo / f).exists()]
    (out / "prompts").mkdir(parents=True, exist_ok=True)
    (out / "judge").mkdir(parents=True, exist_ok=True)
    personas = rubric.get("judge_personas", [{"id": "generalist", "name": "Generalist judge", "brief": ""}])
    manifest = []
    for c in rubric["criteria"]:
        for p in personas:
            if c.get("personas") and p["id"] not in c["personas"]:
                continue
            outfile = out / "judge" / f"{c['id']}__{p['id']}.json"
            txt = PROMPT_TMPL.format(
                persona_name=p["name"], persona_brief=p.get("brief", ""), name=c["name"], cid=c["id"],
                weight=c.get("weight", 0), source=c.get("source", "rubric"), official=c.get("official_wording", ""),
                look_for="\n".join(f"- {x}" for x in c.get("look_for", [])),
                anchors="\n".join(f"- {k}: {v}" for k, v in sorted(c.get("anchors", {}).items())),
                red_flags="\n".join(f"- {x}" for x in c.get("red_flags", [])) or "- (none)",
                evidence="\n".join(f"- {x}" for x in c.get("evidence", [])), outfile=outfile, pid=p["id"],
                challenge=meta.get("challenge", "see docs/CHALLENGE.md"), repo=repo,
                context_files=", ".join(f"`{x}`" for x in ctx) or "(none found)")
            pf = out / "prompts" / f"{c['id']}__{p['id']}.md"
            pf.write_text(txt, encoding="utf-8")
            manifest.append({"criterion": c["id"], "persona": p["id"], "prompt": str(pf), "answer": str(outfile),
                             "agent": p.get("agent", "judge-simulator")})
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {len(manifest)} judge prompts to {out/'prompts'}; manifest: {out/'manifest.json'}")
    print("Dispatch them in parallel from the MAIN session (subagents can't spawn subagents).")


# ------------------------------------------------------------------ scoring
def _num(v, default=None):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    m = re.search(r"-?\d+(\.\d+)?", str(v or ""))
    return float(m.group(0)) if m else default


def parse_judge(txt):
    """Return (dict, None) or (None, reason). Accepts raw JSON, fenced JSON or JSON embedded in prose."""
    cands = [txt.strip()]
    cands += re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", txt, re.S)
    # every balanced {...} block, last first
    depth, start, blocks = 0, None, []
    for i, ch in enumerate(txt):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}" and depth:
            depth -= 1
            if depth == 0:
                blocks.append(txt[start:i + 1])
    cands += list(reversed(blocks))
    d = None
    for c in cands:
        try:
            obj = json.loads(c)
            if isinstance(obj, dict) and "score" in obj:
                d = obj
                break
        except Exception:  # noqa: BLE001
            continue
    if d is None:
        return None, "no JSON object with a 'score' field"
    sc = _num(d.get("score"))
    if sc is None or not (1 <= sc <= 5) or sc != int(sc):
        return None, f"score must be an integer 1-5 (got {d.get('score')!r})"
    d["score"] = int(sc)
    d["fix_effort_hours"] = max(_num(d.get("fix_effort_hours"), 1.0) or 1.0, 0.25)
    for k in ("gaps", "strengths", "evidence"):
        v = d.get(k, [])
        d[k] = [v] if isinstance(v, str) else [str(x) for x in (v or [])]
    return d, None


def score(rubric, out, repo="."):
    out = Path(out)
    auto = json.loads((out / "auto.json").read_text()) if (out / "auto.json").exists() else []
    auto_by = {a["id"]: a for a in auto}
    judge, rejected = {}, []
    crit_ids = {c["id"] for c in rubric["criteria"]}
    for f in sorted((out / "judge").glob("*.json")):
        d, err = parse_judge(f.read_text(encoding="utf-8", errors="ignore"))
        if err:
            rejected.append((f.name, err))
            continue
        cid = str(d.get("criterion") or f.stem.split("__")[0]).strip().lower()
        if cid not in crit_ids:
            cid = f.stem.split("__")[0]
        if cid not in crit_ids:
            rejected.append((f.name, f"unknown criterion '{cid}'"))
            continue
        d["criterion"] = cid
        d.setdefault("persona", f.stem.split("__")[-1])
        judge.setdefault(cid, []).append(d)

    # gates
    gates = []
    for g in rubric.get("gates", []):
        linked = [auto_by[a] for a in g.get("auto", []) if a in auto_by]
        status = "unknown"
        if linked:
            status = "pass" if all(x["pass"] for x in linked) else "FAIL"
        if g.get("judge_items"):
            wt = judge.get("winning_traits", [])
            failed_items = sorted({it for j in wt for gap in j.get("gaps", []) for it in g["judge_items"]
                                   if re.match(rf"^\s*{it}\b", gap)})
            if wt:
                status = "FAIL" if failed_items or status == "FAIL" else ("pass" if status in ("pass", "unknown") else status)
                linked = linked + [{"detail": f"checklist items failed: {', '.join(failed_items) or 'none'}"}]
        gates.append({"id": g["id"], "name": g["name"], "status": status, "consequence": g.get("consequence", ""),
                      "details": [x["detail"] for x in linked]})

    rows, total_w, weighted = [], 0.0, 0.0
    fixes = []
    for c in rubric["criteria"]:
        js = judge.get(c["id"], [])
        scores = [float(j["score"]) for j in js]
        med = statistics.median(scores) if scores else None
        spread = (max(scores) - min(scores)) if len(scores) > 1 else 0
        # auto penalties: any failing linked auto check caps the criterion
        cap = None
        for a in c.get("auto_caps", []):
            if a["check"] in auto_by and not auto_by[a["check"]]["pass"]:
                cap = min(cap or 5, a["cap"])
        final = min(med, cap) if (med is not None and cap) else med
        w = float(c.get("weight", 0))
        if final is not None:
            total_w += w
            weighted += w * final
        rows.append({"id": c["id"], "name": c["name"], "weight": w, "judges": len(js), "median": med,
                     "cap": cap, "final": final, "spread": spread})
        for j in js:
            if j.get("top_fix"):
                gain = w * (5 - (final or 0)) / j["fix_effort_hours"]
                fixes.append((gain, c["id"], j.get("persona"), j["top_fix"], j.get("fix_effort_hours")))
    pct = (weighted / total_w / 5 * 100) if total_w else None
    profiles = {}
    for pname, pw in (rubric.get("meta", {}).get("weight_profiles") or {}).items():
        tw = sum(float(pw.get(r["id"], 0)) for r in rows if r["final"] is not None)
        sw = sum(float(pw.get(r["id"], 0)) * r["final"] for r in rows if r["final"] is not None)
        profiles[pname] = round(sw / tw / 5 * 100, 1) if tw else None
    target = rubric.get("meta", {}).get("target_score", 80)
    gate_fail = [g for g in gates if g["status"] == "FAIL"]

    # history
    hist = out.parent / "history.jsonl"
    prev = None
    if hist.exists():
        lines = [json.loads(l) for l in hist.read_text().splitlines() if l.strip()]
        prev = next((l for l in reversed(lines) if l["run"] != out.name), None)
    rec = {"run": out.name, "time": dt.datetime.now().isoformat(timespec="minutes"), "score_pct": round(pct, 1) if pct is not None else None, "profiles": profiles,
           "gates_failed": [g["id"] for g in gate_fail], "criteria": {r["id"]: r["final"] for r in rows}}
    with hist.open("a") as fh:
        fh.write(json.dumps(rec) + "\n")

    # report
    L = [f"# Judge scorecard: {out.name}", "", f"Generated {rec['time']} · rubric {rubric.get('meta', {}).get('version', '?')} "
         f"({rubric.get('meta', {}).get('criteria_source', '')})", ""]
    weighted_rows = [r for r in rows if r["weight"] > 0]
    judged = [r for r in weighted_rows if r["final"] is not None]
    if len(judged) < len(weighted_rows):
        L.append(f"> ⚠ PARTIAL RUN: only {len(judged)}/{len(weighted_rows)} weighted criteria judged "
                 f"({', '.join(r['id'] for r in weighted_rows if r['final'] is None)} missing); score covers judged criteria only.")
    L.append((f"**Weighted score: {pct:.0f}%**" if pct is not None else "**Weighted score: n/a (no valid judge answers)**")
             + f" (target {target}%)" + (f" · previous run {prev['run']}: {prev['score_pct']}%" if prev else ""))
    if profiles:
        L.append("**By judging round:** " + " · ".join(f"{k}: {v}%" for k, v in profiles.items()))
    L.append(f"**Gates:** {'ALL PASS' if not gate_fail else ', '.join(g['id'] + ' FAIL' for g in gate_fail)}")
    L += ["", "## Gates (hard fails: fix these first)", "", "| Gate | Status | Consequence | Detail |", "|---|---|---|---|"]
    for g in gates:
        L.append(f"| {g['id']} {g['name']} | {g['status']} | {g['consequence']} | {cell('; '.join(g['details'])[:200])} |")
    L += ["", "## Criteria", "", "| Criterion | Weight | Judges | Median | Cap | Final | Δ prev | Judge spread |", "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        d = ""
        if prev and r["final"] is not None and prev["criteria"].get(r["id"]) is not None:
            d = f"{r['final'] - prev['criteria'][r['id']]:+.1f}"
        flag = " ⚠ disagree" if r["spread"] >= 2 else ""
        L.append(f"| {r['name']} | {r['weight']:.0f} | {r['judges']} | {r['median'] if r['median'] is not None else 'not judged'} | "
                 f"{r['cap'] or ''} | {r['final'] if r['final'] is not None else ''} | {d} | {r['spread']}{flag} |")
    L += ["", "## Top fixes (ranked by weight × headroom ÷ effort)", ""]
    for i, (g, cid, pid, fx, eff) in enumerate(sorted(fixes, reverse=True)[:7], 1):
        L.append(f"{i}. **[{cid}/{pid}]** {fx} _(~{eff} h)_")
    L += ["", "## Automated checks", "", "| Check | Result | Detail |", "|---|---|---|"]
    for a in auto:
        res = "pass" if a["pass"] else ("FAIL" if a["severity"] == "error" else a["severity"])
        L.append(f"| {a['id']} | {res} | {cell(a['detail'])} |")
    if rejected:
        L += ["", "## Rejected judge answers (re-run these judges)", ""] + [f"- `{n}`: {why}" for n, why in rejected]
    L += ["", "## Judge gaps (verbatim)", ""]
    for cid, js in judge.items():
        for j in js:
            for gap in j.get("gaps", [])[: (None if cid == "winning_traits" else 5)]:
                L.append(f"- [{cid}/{j.get('persona')}] {gap}")
    (out / "scorecard.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L[:8]))
    print(f"\nScorecard: {out/'scorecard.md'}")
    return 0 if (not gate_fail and pct is not None and pct >= target and len(judged) == len(weighted_rows)) else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    for name in ("auto", "prompts", "score", "all"):
        s = sp.add_parser(name)
        s.add_argument("--rubric", help="default: <repo>/evals/rubric.yaml")
        s.add_argument("--out", required=True, help="run folder, e.g. evals/runs/h12")
        s.add_argument("--repo", default=".")
        s.add_argument("--stage", choices=["draft", "h12", "h24", "h36", "h46"],
                       help="override auto_config.stage")
        s.add_argument("--kickoff", help="override auto_config.kickoff_utc, e.g. 2026-11-13T22:00:00Z (use for dry runs)")
    a = ap.parse_args()
    rubric_path = Path(a.rubric) if a.rubric else Path(a.repo) / "evals" / "rubric.yaml"
    if not rubric_path.exists():
        print(f"ERROR: rubric not found at {rubric_path}", file=sys.stderr)
        return 2
    rubric = load_rubric(rubric_path)
    if a.stage:
        rubric.setdefault("auto_config", {})["stage"] = a.stage
    if a.kickoff:
        rubric.setdefault("auto_config", {})["kickoff_utc"] = a.kickoff
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    if a.cmd in ("auto", "all"):
        res = auto_checks(a.repo, rubric)
        (out / "auto.json").write_text(json.dumps(res, indent=2), encoding="utf-8")
        fails = [r for r in res if not r["pass"] and r["severity"] == "error"]
        for r in res:
            mark = "PASS" if r["pass"] else r["severity"].upper()
            print(f"{mark:8} {r['id']}: {r['detail']}")
        print(f"auto: {len(res) - len(fails)}/{len(res)} without errors -> {out/'auto.json'}")
        if fails and a.cmd == "auto":
            return 1
    if a.cmd in ("prompts", "all"):
        write_prompts(rubric, out, a.repo)
    if a.cmd == "score":
        return score(rubric, out, a.repo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
