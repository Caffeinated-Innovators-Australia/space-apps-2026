#!/usr/bin/env node
// Command-line tool. Calls the same action layer as the app, so answers are identical.
// Output is JSON, for people, scripts and AI agents alike. Needs Node 24 or later.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessValue, casePackContent, demoValues, exportOutbox, history, initialState, parseRules, recordReading, sendCase, type Seed, type State } from '../src/core/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rule = parseRules(readFileSync(join(root, 'rules/rules.yaml'), 'utf8'))[0];
const seed = JSON.parse(readFileSync(join(root, 'src/data/seed.json'), 'utf8')) as Seed;

const [command, ...rest] = process.argv.slice(2);
const opts: Record<string, string> = {};
for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '')] = rest[i + 1];
const stateFile = opts.state ?? join(process.cwd(), '.crew-health-state.json');
const load = (): State => (existsSync(stateFile) ? (JSON.parse(readFileSync(stateFile, 'utf8')) as State) : initialState(seed));
const save = (s: State) => writeFileSync(stateFile, JSON.stringify(s, null, 1) + '\n');
const need = (k: string): string => { if (!opts[k]) throw new Error(`Missing --${k}.`); return opts[k]; };
const print = (x: unknown) => console.log(JSON.stringify(x, null, 2));

const HELP = `crew-health: assess a health reading against a crew member's own baseline.
Assessment and next steps only. Not a diagnosis. Rules are placeholders until clinicians sign them off.

Commands (all print JSON):
  crew                                              list crew members
  indicators                                        list indicators, units and reference ranges
  assess  --crew ID --indicator ID --value N        assess a value; saves nothing
  record  --crew ID --indicator ID --value N        assess and save a reading
  history --crew ID --indicator ID                  baseline, mission values and saved readings
  send    --reading ID [--setting ID]               queue a case for the next link to Earth
  outbox                                            list queued and exported cases
  export  [--out FILE]                              write queued cases to a file and mark them exported
  demo    --crew ID --indicator ID                  example values, one per tier
Options: --state FILE (where readings are kept; default ./.crew-health-state.json)`;

try {
  switch (command) {
    case 'crew': print(seed.crew.map((c) => ({ id: c.id, name: c.name, synthetic: seed.synthetic }))); break;
    case 'indicators': print(seed.indicators.map((i) => ({ id: i.id, name: i.name, region: i.region, unit: i.unit, referenceRange: i.ref, source: i.refSource }))); break;
    case 'assess': print(assessValue(seed, rule, need('crew'), need('indicator'), Number(need('value')))); break;
    case 'demo': print(demoValues(seed, rule, need('crew'), need('indicator'))); break;
    case 'record': {
      const r = recordReading(load(), seed, rule, { crewId: need('crew'), indicatorId: need('indicator'), value: Number(need('value')), at: Date.now() });
      save(r.state);
      print({ reading: r.reading, assessment: r.assessment });
      break;
    }
    case 'history': print(history(load(), seed, need('crew'), need('indicator'))); break;
    case 'send': {
      const r = sendCase(load(), { readingId: need('reading'), settingId: opts.setting ?? seed.settings[0].id, at: Date.now() });
      save(r.state);
      print(casePackContent(r.state, seed, rule, r.pack.id));
      break;
    }
    case 'outbox': { const s = load(); print(s.outbox.map((p) => casePackContent(s, seed, rule, p.id))); break; }
    case 'export': {
      const r = exportOutbox(load(), seed, rule, Date.now());
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
