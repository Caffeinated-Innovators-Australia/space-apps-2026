// Tests for the crew medic's systems screen results (FR-65).
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isbar, initialState, markScreen, pathwayCaseContent, screenSummary, sendPathwayCase, toggleSymptom, type Seed } from './index.ts';
import { parseRules } from './rules.ts';

const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8')) as Seed;
const rules = parseRules(readFileSync('rules/rules.yaml', 'utf8'));

describe('systems screen results (FR-65)', () => {
  it('marks, changes and clears a check, and sums up found items first', () => {
    let s = markScreen(initialState(seed), { crewId: 'crew-4', heading: 'Heart', check: 'Chest pain', result: 'not found', at: 1 });
    s = markScreen(s, { crewId: 'crew-4', heading: 'Blood or fluid loss', check: 'Vomiting or diarrhoea', result: 'found', at: 2 });
    expect(screenSummary(s, 'crew-4')).toBe('Found: Blood or fluid loss: Vomiting or diarrhoea. Not found: Heart: Chest pain.');
    s = markScreen(s, { crewId: 'crew-4', heading: 'Heart', check: 'Chest pain', result: 'not found', at: 3 });
    expect(screenSummary(s, 'crew-4')).toBe('Found: Blood or fluid loss: Vomiting or diarrhoea.');
    expect(screenSummary(s, 'crew-1')).toBeUndefined();
  });
  it('goes with the case and the handover', () => {
    let s = toggleSymptom(toggleSymptom(initialState(seed), 'crew-4', 'Pain in side or lower back', 1), 'crew-4', 'Nauseous', 2);
    s = markScreen(s, { crewId: 'crew-4', heading: 'Blood or fluid loss', check: 'Vomiting or diarrhoea', result: 'found', at: 3 });
    const sent = sendPathwayCase(s, seed, rules, { crewId: 'crew-4', pathwayId: 'KS-01', settingId: 'mars-18', at: 5 });
    const c = pathwayCaseContent(sent.state, seed, rules, sent.pack.id);
    expect(c.systemsScreen).toBe('Found: Blood or fluid loss: Vomiting or diarrhoea.');
    expect(isbar(c).flatMap((x) => x.lines).join(' | ')).toContain('Systems screen (crew medic): Found: Blood or fluid loss: Vomiting or diarrhoea.');
  });
});
