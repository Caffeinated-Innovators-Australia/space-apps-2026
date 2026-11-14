#!/usr/bin/env node
// Command-line tool. Calls the same action layer as the app, so answers are identical.
// Output is JSON, for people, scripts and AI agents alike. Needs Node 24 or later.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessValue, caseContent, casePackContent, crewGoal, dayPlan, daySummary, demoValue, exportOutbox, history, initialState, logPain, parseRules, pathwayCaseContent, pathwayStatuses, recordReading, sendCase, sendPathwayCase, streak, toggleSymptom, type Seed, type State } from '../src/core/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rules = parseRules(readFileSync(join(root, 'rules/rules.yaml'), 'utf8'));
const seed = JSON.parse(readFileSync(join(root, 'src/data/seed.json'), 'utf8')) as Seed;

const [command, ...rest] = process.argv.slice(2);
const opts: Record<string, string> = {};
for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
const stateFile = opts.state ?? join(process.cwd(), '.crew-health-state.json');
const load = (): State => {
  const s = existsSync(stateFile) ? (JSON.parse(readFileSync(stateFile, 'utf8')) as State) : null;
  return s && s.version === 2 ? s : initialState(seed);
};
const save = (s: State) => writeFileSync(stateFile, JSON.stringify(s, null, 1) + '\n');
const need = (k: string): string => { if (!opts[k]) throw new Error(`Missing --${k}.`); return opts[k]; };
const print = (x: unknown) => console.log(JSON.stringify(x, null, 2));

const view = (s: State, crewId: string) => pathwayStatuses(s, seed, rules, crewId).map((p) => ({ rule: p.pathway.id, checksFor: p.pathway.name, level: p.level, title: p.title, why: p.why, steps: p.steps, recentTrends: p.context.map((c) => c.text), painScores: p.pain.map((x) => x.score), placeholder: p.placeholder, note: 'A pattern to check, not a diagnosis.' }));

const HELP = `crew-health: assess a health reading against a crew member's own baseline and their mission so far.
Assessment and next steps only. Not a diagnosis. Rules are placeholders until clinicians sign them off.
Crew values are SYNTHETIC.

Commands (all print JSON):
  crew                                              list crew members
  indicators                                        list indicators, units, limits and explanation cards
  assess  --crew ID --indicator ID --value N        assess a value; saves nothing
  record  --crew ID --indicator ID --value N        assess and save a reading for today
  day     --crew ID                                 today: what is due, what is flagged, the combined picture
  plan    --crew ID [--clock HH:MM]                 today's prompts fitted around the crew timeline
  history --crew ID --indicator ID                  baseline, the mission so far and today's readings
  streak  --crew ID                                 check-in streak and the shared crew goal
  send    --reading ID [--setting ID]               queue a case for the next link to Earth
  symptoms                                          list the symptoms a crew member can log, and the patterns the rules act on
  symptom --crew ID --label "TEXT"                  log a symptom, or clear it if already logged
  pathways --crew ID                                symptom patterns open for this person now, with next steps
  pain    --crew ID --pathway ID --score N          log a pain score from 0 to 10; no threshold is applied
  send-pathway --crew ID --pathway ID [--setting ID]  queue a symptom-pattern case for the next link to Earth
  outbox                                            list queued and exported cases
  export  [--out FILE]                              write queued cases to a file and mark them exported
  demo    --crew ID --indicator ID                  the example value for today's demo
Options: --state FILE (where readings are kept; default ./.crew-health-state.json)`;

try {
  switch (command) {
    case 'crew': print(seed.crew.map((c) => ({ id: c.id, name: c.name, synthetic: seed.synthetic }))); break;
    case 'indicators': print(seed.indicators.map((i) => ({ id: i.id, group: i.group, name: i.name, region: i.region, runningTotal: i.mode === 'cumulative', unit: i.unit, watch: i.watch, cadence: i.cadence, limit: i.limit, referenceRange: i.ref, hazards: i.hazards.map((h) => seed.hazards[h]), card: i.card }))); break;
    case 'assess': print(assessValue(seed, rules, need('crew'), need('indicator'), Number(need('value')))); break;
    case 'demo': print(demoValue(seed, need('crew'), need('indicator'))); break;
    case 'record': {
      const r = recordReading(load(), seed, rules, { crewId: need('crew'), indicatorId: need('indicator'), value: Number(need('value')), at: Date.now() });
      save(r.state);
      print({ reading: r.reading, assessment: r.assessment });
      break;
    }
    case 'day': {
      const d = daySummary(load(), seed, rules, need('crew'));
      print({ missionDay: seed.missionDay, checkIns: d.items.map((x) => ({ indicator: x.indicator.id, due: x.due, askedForToday: x.prompted, value: x.reading?.value, tier: x.assessment?.tier, why: x.assessment?.why })), combined: d.combined, prompt: d.prompt });
      break;
    }
    case 'plan': {
      const s = load();
      print(dayPlan(opts.clock ? { ...s, ui: { ...s.ui, clock: opts.clock } } : s, seed, rules, need('crew')));
      break;
    }
    case 'history': print(history(load(), seed, need('crew'), need('indicator'))); break;
    case 'streak': { const s = load(); print({ streakDays: streak(s, seed, need('crew')), crewGoal: crewGoal(s, seed), note: 'The streak counts check-ins, never results.' }); break; }
    case 'send': {
      const r = sendCase(load(), { readingId: need('reading'), settingId: opts.setting ?? seed.settings[0].id, at: Date.now() });
      save(r.state);
      print(casePackContent(r.state, seed, rules, r.pack.id));
      break;
    }
    case 'symptoms': print({ status: seed.symptoms.status, options: seed.symptoms.options, patterns: rules.pathways.map((w) => ({ id: w.id, checksFor: w.name, opensOn: w.core, alsoAsks: w.supporting, urgentWith: w.urgent, source: w.source, confidence: w.confidence, signedOffBy: w.signed_off_by })) }); break;
    case 'symptom': {
      const label = need('label');
      if (!seed.symptoms.options.includes(label)) throw new Error(`Unknown symptom "${label}". Known: ${seed.symptoms.options.join('; ')}.`);
      const s = toggleSymptom(load(), need('crew'), label, Date.now());
      save(s);
      print({ logged: s.symptoms.filter((x) => x.crewId === opts.crew).map((x) => x.label), pathways: view(s, opts.crew) });
      break;
    }
    case 'pathways': print(view(load(), need('crew'))); break;
    case 'pain': {
      const s = logPain(load(), { crewId: need('crew'), pathwayId: need('pathway'), score: Number(need('score')), at: Date.now() });
      save(s);
      print({ painScores: (s.painLog ?? []).filter((x) => x.crewId === opts.crew && x.pathwayId === opts.pathway), note: 'No threshold is applied to a pain score.' });
      break;
    }
    case 'send-pathway': {
      const r = sendPathwayCase(load(), seed, rules, { crewId: need('crew'), pathwayId: need('pathway'), settingId: opts.setting ?? seed.settings[0].id, at: Date.now() });
      save(r.state);
      print(pathwayCaseContent(r.state, seed, rules, r.pack.id));
      break;
    }
    case 'outbox': { const s = load(); print(s.outbox.map((p) => caseContent(s, seed, rules, p.id))); break; }
    case 'export': {
      const r = exportOutbox(load(), seed, rules, Date.now());
      save(r.state);
      if (opts.out) { writeFileSync(opts.out, JSON.stringify(r.file, null, 2) + '\n'); print({ written: opts.out, cases: r.file.cases.length }); } else print(r.file);
      break;
    }
    default: console.log(HELP);
  }
} catch (e) {
  console.error(JSON.stringify({ error: (e as Error).message }));
  process.exit(1);
}
