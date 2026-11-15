// Speech: turn what a person said into numbers for a form, and turn an alert into words to say aloud.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// Pure functions. The speech recogniser and the voice are AI models in the browser; everything here is plain rules,
// so a misheard word can only ever give a number that is read back and checked, never a tier or a decision.
import { VITAL_FIELDS, vitalField, type VitalField, type VitalsAlert } from './vitals.ts';
import type { VitalSigns } from './types.ts';

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const isNumberWord = (w: string) => w in UNITS || w in TENS || w === 'hundred' || w === 'point' || w === 'and';

/** The whole-number part of a run of number words: "one hundred and twelve", "thirty eight", "one eighteen", "one twenty four". */
function wholeFromWords(words: string[]): number | undefined {
  const ws = words.filter((w) => w !== 'and');
  if (ws.length === 0) return undefined;
  if (ws.includes('hundred')) {
    const i = ws.indexOf('hundred');
    const head = i === 0 ? 1 : wholeFromWords(ws.slice(0, i));
    const tail = i === ws.length - 1 ? 0 : wholeFromWords(ws.slice(i + 1));
    return head === undefined || tail === undefined ? undefined : head * 100 + tail;
  }
  // "one eighteen" and "one twenty four" are how people say 118 and 124.
  if (ws.length >= 2 && ws[0] in UNITS && UNITS[ws[0]] >= 1 && UNITS[ws[0]] <= 9 && (ws[1] in TENS || (ws[1] in UNITS && UNITS[ws[1]] >= 10))) {
    const tail = wholeFromWords(ws.slice(1));
    return tail === undefined ? undefined : UNITS[ws[0]] * 100 + tail;
  }
  if (ws.length === 1) return ws[0] in UNITS ? UNITS[ws[0]] : TENS[ws[0]];
  if (ws.length === 2 && ws[0] in TENS && ws[1] in UNITS && UNITS[ws[1]] >= 1 && UNITS[ws[1]] <= 9) return TENS[ws[0]] + UNITS[ws[1]];
  return undefined;
}

function numberFromWords(words: string[]): number | undefined {
  const p = words.indexOf('point');
  const whole = wholeFromWords(p === -1 ? words : words.slice(0, p));
  if (whole === undefined) return undefined;
  if (p === -1) return whole;
  const digits = words.slice(p + 1).map((w) => (w in UNITS && UNITS[w] <= 9 ? String(UNITS[w]) : undefined));
  if (digits.length === 0 || digits.some((d) => d === undefined)) return undefined;
  return Number(`${whole}.${digits.join('')}`);
}

/** Lower case, digits for number words, " over " for a slash between numbers, and nothing else but letters, digits and dots. */
export function normaliseSpeech(text: string): string {
  const cleaned = text.toLowerCase().replace(/(\d)\s*\/\s*(\d)/g, '$1 over $2').replace(/,(\d)/g, '.$1').replace(/[^a-z0-9. ]+/g, ' ').replace(/\.(?!\d)/g, ' ');
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length === 0) return;
    let trailing = 0;
    while (run.length && run[run.length - 1] === 'and') { run.pop(); trailing += 1; }
    const n = numberFromWords(run);
    if (n !== undefined) out.push(String(n)); else out.push(...run);
    for (let i = 0; i < trailing; i += 1) out.push('and');
    run = [];
  };
  for (const w of cleaned.split(/\s+/).filter(Boolean)) {
    if (isNumberWord(w) && !(w === 'and' && run.length === 0)) run.push(w);
    else { flush(); out.push(w); }
  }
  flush();
  // "seven and a half" is 7.5.
  return out.join(' ').replace(/\b(\d+) and a half\b/g, (_m, n: string) => String(Number(n) + 0.5));
}

/** The first number in what was said, as digits or as words. Undefined when there is none. */
export function spokenNumber(text: string): number | undefined {
  const m = normaliseSpeech(text).match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : undefined;
}

export type SpokenIntent = 'yes' | 'no' | 'skip' | 'back' | 'stop' | 'repeat';
/** A command word in what was said, or undefined when it reads as an answer. */
export function spokenIntent(text: string): SpokenIntent | undefined {
  const t = ` ${text.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (/ (stop|cancel|quit) /.test(t)) return 'stop';
  if (/ (go back|back|previous) /.test(t)) return 'back';
  if (/ (repeat|say that again|say again|pardon) /.test(t)) return 'repeat';
  if (/ (skip|not measured|not taken|pass|leave it out|next) /.test(t)) return 'skip';
  if (/ (start again|start over|no|wrong|change) /.test(t)) return 'no';
  if (/ (yes|yeah|yep|correct|save|confirm|that's right|that is right|okay|ok) /.test(t)) return 'yes';
  return undefined;
}

const KEYWORDS: { field: VitalField | 'bp'; re: RegExp }[] = [
  { field: 'temp', re: /\b(temperature|temp)\b/g },
  { field: 'hr', re: /\b(pulse|heart rate|heart)\b/g },
  { field: 'bp', re: /\b(blood pressure|pressure|bp)\b/g },
  { field: 'rr', re: /\b(breathing rate|breathing|respiratory rate|respiration|breaths)\b/g },
  { field: 'spo2', re: /\b(oxygen saturation|oxygen|saturation|sats|sat|spo2|o2)\b/g },
];
const NUM = /\d+(?:\.\d+)?/g;

function bloodPressure(part: string): VitalSigns {
  const pair = part.match(/(\d+(?:\.\d+)?)\s*(?:over|on)\s*(\d+(?:\.\d+)?)/);
  if (pair) return { sbp: Number(pair[1]), dbp: Number(pair[2]) };
  const one = part.match(NUM);
  return one ? { sbp: Number(one[0]) } : {};
}

/**
 * The vital signs in one spoken sentence. "Pulse 118, temperature 38.6, blood pressure 94 over 56" fills four fields at once.
 * With no field named, a bare number goes to `current`, the field the app has just asked for.
 * Values are not range-checked here; the form's own plausibility checks do that, as they do for typing.
 */
export function parseVitalsUtterance(text: string, current?: VitalField): VitalSigns {
  const s = normaliseSpeech(text);
  const hits: { field: VitalField | 'bp'; at: number; end: number }[] = [];
  for (const k of KEYWORDS) for (const m of s.matchAll(k.re)) hits.push({ field: k.field, at: m.index!, end: m.index! + m[0].length });
  hits.sort((a, b) => a.at - b.at || b.end - a.end);
  const kept = hits.filter((h, i) => !hits.slice(0, i).some((p) => h.at < p.end));
  const out: VitalSigns = {};
  if (kept.length === 0) {
    if (!current) return out;
    if (current === 'sbp' || /\d\s*(over|on)\s*\d/.test(s)) {
      const bp = bloodPressure(s);
      if (current === 'sbp' || bp.dbp !== undefined) return bp;
    }
    const n = s.match(NUM);
    if (n) out[current] = Number(n[0]);
    return out;
  }
  kept.forEach((h, i) => {
    const part = s.slice(h.end, kept[i + 1]?.at ?? s.length);
    if (h.field === 'bp') Object.assign(out, bloodPressure(part));
    else { const n = part.match(NUM); if (n) out[h.field] = Number(n[0]); }
  });
  return out;
}

/** What the app asks aloud for each vital sign. */
export const VITAL_QUESTIONS: { id: VitalField; ask: string }[] = [
  { id: 'temp', ask: 'Temperature, in degrees Celsius?' },
  { id: 'hr', ask: 'Pulse, in beats a minute?' },
  { id: 'sbp', ask: 'Blood pressure? Say it as upper over lower.' },
  { id: 'dbp', ask: 'Blood pressure, lower number?' },
  { id: 'rr', ask: 'Breathing rate, in breaths a minute?' },
  { id: 'spo2', ask: 'Oxygen saturation, as a percentage?' },
];

/** The read-back for one value, so the person hears what the app took down. */
export function vitalReadBack(id: VitalField, value: number): string {
  const f = vitalField(id);
  const v = value.toFixed(f.dp);
  if (id === 'temp') return `Temperature ${v} degrees.`;
  if (id === 'hr') return `Pulse ${v}.`;
  if (id === 'sbp') return `Blood pressure upper ${v}.`;
  if (id === 'dbp') return `Lower ${v}.`;
  if (id === 'rr') return `Breathing ${v} a minute.`;
  return `Oxygen saturation ${v} percent.`;
}

/** Why a spoken value is refused, in words to say aloud, or undefined when it is plausible. Plausibility only, not a clinical limit. */
export function vitalSpokenProblem(id: VitalField, value: number): string | undefined {
  const f = vitalField(id);
  return value < f.min || value > f.max ? `${f.label} of ${value} cannot be right.` : undefined;
}

/** The symptoms named in what was said, matched against the app's own list. Never invents one. */
export function spokenSymptoms(text: string, options: string[]): string[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ')} `;
  return options.filter((o) => {
    const words = o.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
    return words.length > 0 && t.includes(` ${words} `);
  });
}

/** An Act now alert as words to say aloud. The same words as the card; nothing is added. */
export function alertSpeech(alert: Pick<VitalsAlert, 'title' | 'reasons' | 'steps'>): string {
  const steps = alert.steps.map((s, i) => `Step ${i + 1}. ${s}`).join(' ');
  return `Act now. ${alert.title}. Not a diagnosis. A pattern to act on now. ${alert.reasons.join('. ')}. First steps. ${steps}`.replace(/\.\./g, '.');
}

export const SPEAKABLE_FIELDS = VITAL_FIELDS.map((f) => f.id);
