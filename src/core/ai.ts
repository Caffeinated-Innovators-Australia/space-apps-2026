// AI connections (FR-60 to FR-62): an optional small language model that turns what the crew member says into form
// values, symptoms and a suggested emergency checklist, and an optional AI clinical assistant for when Earth or the
// flight surgeon cannot be reached. Both are off by default.
// The rules still decide every tier. Whatever a model returns is checked here against the app's own lists and
// plausibility bounds, and anything it suggests is shown for the crew member to confirm. Nothing opens by itself.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import astra from '../data/astra-checklists.json' with { type: 'json' };
import { spokenSymptoms } from './speech.ts';

export interface Checklist { construct: number; name: string; tier: string; keywords: Record<string, number> }
export const CHECKLISTS: Checklist[] = (astra as unknown as { checklists: Checklist[] }).checklists;

/** One connection to a model server. The key is kept on this device only, never in the record or a case. */
export interface ModelConnection { endpoint: string; model: string; key?: string }

export interface AiSettings {
  /** How spoken answers are understood: the built-in word matching, or a small language model. */
  interpreter: 'built-in' | 'slm';
  /** A small model on the crew's own device or base computer, through an OpenAI-compatible server (for example Ollama or llama.cpp). */
  slm: ModelConnection;
  /** The AI clinical assistant: off, a cloud frontier model, or a model on a computer at the location. */
  assistant: 'off' | 'cloud' | 'on-location';
  /** Cloud frontier model through the Anthropic Messages API. */
  cloud: ModelConnection;
  /** A model on a computer at the location, through an OpenAI-compatible server (for example vLLM or Ollama running Qwen, Gemma, Kimi or GLM). */
  onLocation: ModelConnection;
  /** CR-50: the assistant may name generic medicines and doses, as suggestions for the crew medic to check. */
  allowMedicines: boolean;
}

export const DEFAULT_AI: AiSettings = {
  interpreter: 'built-in',
  slm: { endpoint: 'http://localhost:11434/v1/chat/completions', model: '' },
  assistant: 'off',
  cloud: { endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-opus-5-5' },
  onLocation: { endpoint: 'http://localhost:8000/v1/chat/completions', model: '' },
  allowMedicines: true,
};

/** A cloud model is offered only where an answer comes back quickly: a one-way delay to Earth of a minute or less. */
export const CLOUD_MAX_DELAY_SECONDS = 60;

/** Which assistant connection to use at this place, or why none can be used. */
export function assistantRoute(s: AiSettings, replySeconds: number): { use: 'cloud' | 'on-location' | null; why: string } {
  if (s.assistant === 'off') return { use: null, why: 'The AI clinical assistant is off. Turn it on in AI connections.' };
  if (s.assistant === 'cloud') {
    if (replySeconds > CLOUD_MAX_DELAY_SECONDS) return { use: null, why: 'A cloud model on Earth is too far away from here for a conversation. Switch to a model on a computer at your location.' };
    if (!s.cloud.endpoint || !s.cloud.model || !s.cloud.key) return { use: null, why: 'The cloud model needs its address, model name and key in AI connections.' };
    return { use: 'cloud', why: '' };
  }
  if (!s.onLocation.endpoint || !s.onLocation.model) return { use: null, why: 'The on-location model needs its address and model name in AI connections.' };
  return { use: 'on-location', why: '' };
}

// ---------- Understanding what was said ----------

export interface FieldSpec { id: string; name: string; unit: string; min: number; max: number }
export interface InterpretContext { fields: FieldSpec[]; symptoms: string[]; checklists?: Checklist[] }
export interface Interpretation { values: Record<string, number>; symptoms: string[]; checklist: { construct: number; name: string; reason: string } | null; source: 'slm' | 'built-in' }

/** The instruction to the small model. It asks for JSON only, and lists exactly what may be filled. */
export function interpretMessages(ctx: InterpretContext, said: string): { role: 'system' | 'user'; content: string }[] {
  const fields = ctx.fields.map((f) => `- ${f.id}: ${f.name} in ${f.unit}, between ${f.min} and ${f.max}`).join('\n') || '- none';
  const lists = (ctx.checklists ?? CHECKLISTS).map((c) => `- ${c.construct}: ${c.name}`).join('\n');
  return [
    {
      role: 'system',
      content: [
        'You turn what an astronaut said into form entries for a crew health app. Reply with JSON only, no other text:',
        '{"values": {"<field id>": <number>}, "symptoms": ["<symptom exactly as listed>"], "checklist": {"construct": <number>, "reason": "<short reason>"} | null}',
        'Use only these fields:', fields,
        'Use only these symptoms, spelled exactly:', ctx.symptoms.map((s) => `- ${s}`).join('\n') || '- none',
        'Suggest an emergency checklist only if what was said sounds like an emergency, using only these numbers:', lists,
        'Never add a value, symptom or checklist that was not said or clearly meant. Never name a diagnosis. Leave anything unclear out.',
      ].join('\n'),
    },
    { role: 'user', content: said },
  ];
}

/** Pull the JSON object out of a model's reply, tolerating code fences or text around it. */
function firstJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return undefined;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return undefined; }
}

/** Check a model's reply against the app's own lists and bounds. Anything unknown or out of range is dropped. */
export function checkInterpretation(reply: string, ctx: InterpretContext): Interpretation | null {
  const j = firstJson(reply) as { values?: Record<string, unknown>; symptoms?: unknown; checklist?: { construct?: unknown; reason?: unknown } | null } | undefined;
  if (!j || typeof j !== 'object') return null;
  const values: Record<string, number> = {};
  for (const f of ctx.fields) {
    const v = Number(j.values?.[f.id]);
    if (j.values?.[f.id] !== undefined && Number.isFinite(v) && v >= f.min && v <= f.max) values[f.id] = v;
  }
  const symptoms = Array.isArray(j.symptoms) ? ctx.symptoms.filter((s) => (j.symptoms as unknown[]).includes(s)) : [];
  const lists = ctx.checklists ?? CHECKLISTS;
  const c = j.checklist && lists.find((x) => x.construct === Number(j.checklist!.construct));
  return { values, symptoms, checklist: c ? { construct: c.construct, name: c.name, reason: String(j.checklist!.reason ?? '').slice(0, 200) } : null, source: 'slm' };
}

/** The checklist whose keywords best match what was said, with no model: the emergency module's own keyword weights. */
export function keywordChecklist(said: string, lists: Checklist[] = CHECKLISTS): { construct: number; name: string; reason: string } | null {
  const t = ` ${said.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ')} `;
  let best: { c: Checklist; score: number; words: string[] } | null = null;
  for (const c of lists) {
    const words = Object.keys(c.keywords).filter((k) => t.includes(` ${k}`));
    const score = words.reduce((n, k) => n + c.keywords[k], 0);
    if (score > 0 && (!best || score > best.score)) best = { c, score, words };
  }
  return best ? { construct: best.c.construct, name: best.c.name, reason: `You said: ${best.words.slice(0, 3).join(', ')}.` } : null;
}

/** The built-in understanding, used when no model is set up or the model cannot be reached. */
export function builtInInterpretation(said: string, ctx: InterpretContext): Interpretation {
  return { values: {}, symptoms: spokenSymptoms(said, ctx.symptoms), checklist: keywordChecklist(said, ctx.checklists), source: 'built-in' };
}

// ---------- The AI clinical assistant ----------

/** The standing instruction to the assistant. Rules decide tiers; the assistant supports the crew medic. */
export function assistantSystem(opts: { place: string; reason: string; allowMedicines: boolean }): string {
  return [
    'You are the AI clinical assistant in a crew health app, used when Earth or the flight surgeon cannot be reached.',
    `Place: ${opts.place}. Why you were asked: ${opts.reason}.`,
    'You support the crew medic, who decides. Be brief and practical, in plain words, with numbered next steps.',
    "The app's rules set every alert level. Never change, lower or argue against an alert. If anything sounds life-threatening, open your reply with: press Emergency now.",
    'Say what to check for and what to do next. Do not give a diagnosis as fact; say what it could be and what would tell them apart.',
    opts.allowMedicines
      ? 'You may name generic medicines and adult doses, each marked "Suggestion: check against your formulary and protocol before giving". Never brand names.'
      : 'Do not name any medicine or dose. Say "as your protocol sets out" instead.',
    'Say when to contact Earth as soon as the link returns.',
  ].join('\n');
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** Every assistant reply is shown with this line. */
export const AI_LABEL = 'AI suggestion. Not a diagnosis. The crew medic decides, and the rules still set every alert.';

// ---------- Talking to a model server ----------

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Send to a server that speaks the OpenAI chat completions format (Ollama, llama.cpp, vLLM and others). */
export async function chatOpenAiCompatible(c: ModelConnection, messages: { role: string; content: string }[], fetcher: Fetch, signal?: AbortSignal): Promise<string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (c.key) headers.authorization = `Bearer ${c.key}`;
  const r = await fetcher(c.endpoint, { method: 'POST', headers, body: JSON.stringify({ model: c.model, messages, temperature: 0 }), signal });
  if (!r.ok) throw new Error(`The model server answered ${r.status}.`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const text = j.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new Error('The model server sent no answer.');
  return text;
}

/** Send to the Anthropic Messages API, from the browser. */
export async function chatAnthropic(c: ModelConnection, system: string, messages: ChatTurn[], fetcher: Fetch, signal?: AbortSignal): Promise<string> {
  const r = await fetcher(c.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': c.key ?? '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: c.model, max_tokens: 1024, system, messages }),
    signal,
  });
  if (!r.ok) throw new Error(`The cloud model answered ${r.status}.`);
  const j = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n').trim();
  if (!text) throw new Error('The cloud model sent no answer.');
  return text;
}

/** Ask the small model to understand what was said. Falls back to the built-in understanding if it cannot be reached or replies badly. */
export async function interpret(s: AiSettings, ctx: InterpretContext, said: string, fetcher: Fetch): Promise<Interpretation> {
  if (s.interpreter !== 'slm' || !s.slm.endpoint || !s.slm.model) return builtInInterpretation(said, ctx);
  try {
    const reply = await chatOpenAiCompatible(s.slm, interpretMessages(ctx, said), fetcher);
    const got = checkInterpretation(reply, ctx);
    if (!got) return builtInInterpretation(said, ctx);
    // Keep a critical emergency the keywords catch, even if the model missed it: a missed emergency costs more than a
    // second look. Only the critical checklists, so a mild cough or headache in a check-in raises nothing.
    return got.checklist ? got : { ...got, checklist: keywordChecklist(said, (ctx.checklists ?? CHECKLISTS).filter((c) => c.tier === 'crit')) };
  } catch {
    return builtInInterpretation(said, ctx);
  }
}

/** Ask the assistant. Returns its reply, or throws with a plain reason. */
export async function askAssistant(s: AiSettings, replySeconds: number, system: string, turns: ChatTurn[], fetcher: Fetch): Promise<string> {
  const route = assistantRoute(s, replySeconds);
  if (!route.use) throw new Error(route.why);
  if (route.use === 'cloud') return chatAnthropic(s.cloud, system, turns, fetcher);
  return chatOpenAiCompatible(s.onLocation, [{ role: 'system', content: system }, ...turns], fetcher);
}

// ---------- Settings kept on this device ----------

const KEY = 'crew-health-ai-settings';

/** Read the settings from this device. Falls back to the defaults if storage is missing or blocked. */
export function loadAi(storage?: Pick<Storage, 'getItem'>): AiSettings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return DEFAULT_AI;
    const j = JSON.parse(raw) as Partial<AiSettings>;
    return { ...DEFAULT_AI, ...j, slm: { ...DEFAULT_AI.slm, ...j.slm }, cloud: { ...DEFAULT_AI.cloud, ...j.cloud }, onLocation: { ...DEFAULT_AI.onLocation, ...j.onLocation } };
  } catch { return DEFAULT_AI; }
}

/** Save the settings on this device only. Keys never leave it except to the server they belong to. */
export function saveAi(s: AiSettings, storage?: Pick<Storage, 'setItem'>): void {
  try { storage?.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: the settings last until the page closes */ }
}
