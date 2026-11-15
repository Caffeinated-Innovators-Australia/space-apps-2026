// Tests for the AI connections (FR-60 to FR-62). No real network: every server here is a stand-in.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { describe, expect, it } from 'vitest';
import { askAssistant, assistantRoute, assistantSystem, builtInInterpretation, checkInterpretation, CHECKLISTS, DEFAULT_AI, interpret, interpretMessages, keywordChecklist, loadAi, redFlagSymptoms, saveAi, type AiSettings, type InterpretContext } from './ai.ts';

const ctx: InterpretContext = {
  fields: [{ id: 'sleep', name: 'Sleep', unit: 'h', min: 0, max: 16 }, { id: 'resting-hr', name: 'Resting heart rate', unit: 'bpm', min: 30, max: 200 }],
  symptoms: ['Headache', 'Nauseous', 'Seizure', 'Thoughts of suicide'],
};
const server = (reply: unknown, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => reply });
const openAiReply = (text: string) => ({ choices: [{ message: { content: text } }] });
const slmOn: AiSettings = { ...DEFAULT_AI, interpreter: 'slm', slm: { endpoint: 'http://localhost:11434/v1/chat/completions', model: 'small-model' } };

describe('understanding what was said', () => {
  it('lists only the app\'s own fields, symptoms and checklists in the instruction', () => {
    const [sys] = interpretMessages(ctx, 'slept six hours');
    expect(sys.content).toContain('- sleep: Sleep in h, between 0 and 16');
    expect(sys.content).toContain('- Headache');
    expect(sys.content).toContain('- 6: Neurological Emergency');
    expect(sys.content).toContain('Never name a diagnosis');
  });
  it('keeps only known, plausible values, listed symptoms and a real checklist from a model reply', () => {
    const got = checkInterpretation('```json\n{"values": {"sleep": 6.5, "resting-hr": 900, "mood": 3}, "symptoms": ["Headache", "Migraine"], "checklist": {"construct": 6, "reason": "said fitting"}}\n```', ctx)!;
    expect(got.values).toEqual({ sleep: 6.5 });
    expect(got.symptoms).toEqual(['Headache']);
    expect(got.checklist).toEqual({ construct: 6, name: 'Neurological Emergency', reason: 'said fitting' });
    expect(checkInterpretation('{"checklist": {"construct": 99}}', ctx)!.checklist).toBeNull();
    expect(checkInterpretation('no json here', ctx)).toBeNull();
  });
  it('fills the form through the small model, and falls back to the built-in matching if it fails or is off', async () => {
    const via = await interpret(slmOn, ctx, 'slept six and a half hours, bit of a headache', server(openAiReply('{"values":{"sleep":6.5},"symptoms":["Headache"],"checklist":null}')));
    expect(via).toMatchObject({ source: 'slm', values: { sleep: 6.5 }, symptoms: ['Headache'] });
    const down = await interpret(slmOn, ctx, 'I have a headache', server({}, false));
    expect(down).toMatchObject({ source: 'built-in', symptoms: ['Headache'] });
    expect((await interpret(DEFAULT_AI, ctx, 'nauseous', server({}))).source).toBe('built-in');
  });
  it('keeps an emergency the keywords catch even when the model misses it', async () => {
    const got = await interpret(slmOn, ctx, 'he is having a seizure', server(openAiReply('{"values":{},"symptoms":["Seizure"],"checklist":null}')));
    expect(got.checklist?.construct).toBe(6);
  });
});

describe('recognising an emergency by voice without a model', () => {
  it('suggests the checklist whose keywords best match, and nothing for ordinary talk', () => {
    expect(keywordChecklist('she collapsed and is not breathing')?.construct).toBe(1);
    expect(keywordChecklist('he says he has chest pain and his heart is racing')?.construct).toBe(5);
    expect(keywordChecklist('there is smoke and an ammonia alarm')?.construct).toBe(7);
    expect(keywordChecklist('all good today, thanks')).toBeNull();
    expect(CHECKLISTS).toHaveLength(16);
  });
});

describe('the AI clinical assistant', () => {
  it('uses a cloud model only where Earth answers within a minute, otherwise the model at the location', () => {
    const cloud: AiSettings = { ...DEFAULT_AI, assistant: 'cloud', cloud: { ...DEFAULT_AI.cloud, key: 'test-key' } };
    expect(assistantRoute(cloud, 0.5).use).toBe('cloud');
    expect(assistantRoute(cloud, 2676)).toMatchObject({ use: null });
    expect(assistantRoute(cloud, 2676).why).toContain('computer at your location');
    expect(assistantRoute({ ...DEFAULT_AI, assistant: 'on-location', onLocation: { endpoint: 'http://base:8000/v1/chat/completions', model: 'big-open-model' } }, 2676).use).toBe('on-location');
    expect(assistantRoute(DEFAULT_AI, 0).use).toBeNull();
  });
  it('tells the model that rules set every alert, to say press Emergency before anything else, and how to treat medicines', () => {
    const on = assistantSystem({ place: 'Mars base', reason: 'no link to Earth', allowMedicines: true });
    expect(on).toContain('Never change, lower or argue against an alert');
    expect(on).toContain('press Emergency now');
    expect(on).toContain('check against your formulary and protocol');
    expect(assistantSystem({ place: 'Mars base', reason: 'x', allowMedicines: false })).toContain('Do not name any medicine or dose');
  });
  it('sends to the Anthropic API for the cloud and to an OpenAI-compatible server on location', async () => {
    const seen: { url: string; headers: Record<string, string>; body: string }[] = [];
    const rec = (reply: unknown) => async (url: string, init: { headers: Record<string, string>; body: string }) => { seen.push({ url, ...init }); return { ok: true, status: 200, json: async () => reply }; };
    const cloud: AiSettings = { ...DEFAULT_AI, assistant: 'cloud', cloud: { ...DEFAULT_AI.cloud, key: 'test-key' } };
    expect(await askAssistant(cloud, 1, 'system', [{ role: 'user', content: 'help' }], rec({ content: [{ type: 'text', text: 'Step 1.' }] }))).toBe('Step 1.');
    expect(seen[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(seen[0].headers['x-api-key']).toBe('test-key');
    expect(JSON.parse(seen[0].body).model).toBe('claude-opus-5-5');
    const local: AiSettings = { ...DEFAULT_AI, assistant: 'on-location', onLocation: { endpoint: 'http://base:8000/v1/chat/completions', model: 'big-open-model' } };
    expect(await askAssistant(local, 2676, 'system', [{ role: 'user', content: 'help' }], rec(openAiReply('Step A.')))).toBe('Step A.');
    expect(JSON.parse(seen[1].body).messages[0]).toEqual({ role: 'system', content: 'system' });
    await expect(askAssistant(DEFAULT_AI, 1, 's', [], rec({}))).rejects.toThrow(/off/);
  });
});

describe('settings kept on this device', () => {
  it('saves and loads, and falls back to the defaults when storage is empty or blocked', () => {
    const box: Record<string, string> = {};
    const storage = { getItem: (k: string) => box[k] ?? null, setItem: (k: string, v: string) => { box[k] = v; } };
    saveAi({ ...DEFAULT_AI, interpreter: 'slm' }, storage);
    expect(loadAi(storage).interpreter).toBe('slm');
    expect(loadAi({ getItem: () => { throw new Error('blocked'); } })).toEqual(DEFAULT_AI);
    expect(DEFAULT_AI.interpreter).toBe('built-in');
    expect(DEFAULT_AI.assistant).toBe('off');
  });
});

describe('fixes from testing against a real small model (Gemma 4 E2B)', () => {
  const all = ['Thoughts of suicide', 'Thoughts of harming myself', 'Have harmed myself', 'Thoughts of harming someone else', 'Collapse', 'Short of breath', 'Headache'];
  it('reads a reply that copied "| null" from the instruction', () => {
    const got = checkInterpretation('{"values": {}, "symptoms": ["Headache"], "checklist": {"construct": 6, "reason": "x"} | null}', { fields: [], symptoms: all })!;
    expect(got.symptoms).toEqual(['Headache']);
    expect(got.checklist?.construct).toBe(6);
  });
  it('always catches red-flag phrases, with or without a model', async () => {
    expect(redFlagSymptoms("I've been having thoughts of ending my life", all)).toEqual(['Thoughts of suicide']);
    expect(redFlagSymptoms('I want to hurt someone', all)).toEqual(['Thoughts of harming someone else']);
    expect(redFlagSymptoms('I hurt my knee', all)).toEqual([]);
    expect(builtInInterpretation('I keep thinking about killing myself', { fields: [], symptoms: all }).symptoms).toContain('Thoughts of suicide');
    const missed = await interpret(slmOn, { fields: [], symptoms: all }, 'I have been thinking of ending it all', server(openAiReply('{"values":{},"symptoms":[],"checklist":null}')));
    expect(missed.symptoms).toEqual(['Thoughts of suicide']);
  });
  it('lets a cardiac arrest the keywords catch win over a different model suggestion', async () => {
    const got = await interpret(slmOn, { fields: [], symptoms: all }, "He's collapsed and he's not breathing!", server(openAiReply('{"values":{},"symptoms":["Collapse"],"checklist":{"construct":2,"reason":"breathing"}}')));
    expect(got.checklist?.construct).toBe(1);
  });
  it('never suggests a checklist on a routine form, and gives scale words to the model', async () => {
    const form: InterpretContext = { fields: [{ id: 'mood', name: 'Mood', unit: 'of 5', min: 1, max: 5, labels: ['Very low', 'Low', 'Neutral', 'Good', 'Very good'] }], symptoms: [], suggestChecklist: false };
    expect(interpretMessages(form, 'x')[0].content).toContain('1 = Very low, 2 = Low, 3 = Neutral');
    expect(interpretMessages(form, 'x')[0].content).toContain('Always reply with "checklist": null');
    const got = await interpret(slmOn, form, 'mood is low, breathing fine', server(openAiReply('{"values":{"mood":2},"symptoms":[],"checklist":{"construct":2,"reason":"breathing"}}')));
    expect(got).toMatchObject({ values: { mood: 2 }, checklist: null });
  });
});

describe('layouts a small model actually used', () => {
  it('reads values at the top level and symptoms inside "values"', () => {
    const flat = checkInterpretation('{"sleep": 6.5, "resting-hr": 62, "mood": null}', ctx)!;
    expect(flat.values).toEqual({ sleep: 6.5, 'resting-hr': 62 });
    const nested = checkInterpretation('{"values": {"symptoms": ["Headache", "Nauseous"]}, "checklist": null}', ctx)!;
    expect(nested.symptoms).toEqual(['Headache', 'Nauseous']);
  });
});

describe('more slips a small model made', () => {
  it('reads a bare checklist number, a missing closing brace, and keeps a hazardous atmosphere in the safety net', async () => {
    expect(checkInterpretation('{"values": {"symptoms": ["Headache"]}, "checklist": 7}', ctx)!.checklist?.construct).toBe(7);
    const unclosed = checkInterpretation('{"values": {"symptoms": ["Headache", "Nauseous"]}, "checklist": 11', ctx)!;
    expect(unclosed.symptoms).toEqual(['Headache', 'Nauseous']);
    expect(unclosed.checklist?.construct).toBe(11);
    const got = await interpret(slmOn, ctx, 'smoke in the module and the ammonia alarm went off', server(openAiReply('{"values":{},"symptoms":[],"checklist":null}')));
    expect(got.checklist?.construct).toBe(7);
  });
});
