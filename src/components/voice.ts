// The browser's voice and speech recogniser, wrapped so the rest of the app never touches them directly.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// Both are AI models supplied by the browser. Speech out works with no internet on most devices. Speech in may send audio
// to the browser maker and need the internet in some browsers, so it only ever starts from a tap. Neither is ever required.

interface Recogniser {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecogniserCtor = new () => Recogniser;

function recogniserCtor(): RecogniserCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecogniserCtor; webkitSpeechRecognition?: RecogniserCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
function synth(): SpeechSynthesis | undefined {
  try { return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined; } catch { return undefined; }
}

export const canSpeak = (): boolean => Boolean(synth());
export const canListen = (): boolean => Boolean(recogniserCtor());

/** Say one thing aloud. Resolves when it has been said, or after a safe wait if the browser never reports the end. */
export function speak(text: string): Promise<void> {
  const s = synth();
  if (!s || !text.trim()) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
    const timer = setTimeout(finish, Math.min(30_000, 1_500 + text.length * 90));
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-AU';
      u.rate = 1;
      u.onend = finish;
      u.onerror = finish;
      s.speak(u);
    } catch { finish(); }
  });
}

export function stopSpeaking(): void {
  try { synth()?.cancel(); } catch { /* Speech is a help, never a requirement. */ }
}

/** Listen for one answer. Resolves with what was heard, or an empty string when nothing was. */
export function listenOnce(): { heard: Promise<string>; stop: () => void } {
  const Ctor = recogniserCtor();
  if (!Ctor) return { heard: Promise.resolve(''), stop: () => {} };
  let rec: Recogniser | undefined;
  const heard = new Promise<string>((resolve) => {
    let done = false;
    const finish = (t: string) => { if (!done) { done = true; resolve(t); } };
    try {
      rec = new Ctor();
      rec.lang = 'en-AU';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => finish(Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ').trim());
      rec.onerror = () => finish('');
      rec.onend = () => finish('');
      rec.start();
    } catch { finish(''); }
  });
  return { heard, stop: () => { try { rec?.abort(); } catch { /* ignore */ } } };
}
