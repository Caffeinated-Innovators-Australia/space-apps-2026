// Lets a small language model (FR-60) understand spoken answers on the Talk cards, falling back to the built-in matching.
// Whatever the model returns has already been checked against the app's lists and bounds, and the Talk card still reads
// every value back and saves only on "save". A suggested emergency checklist is shown for the crew member to open.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import { interpret, loadAi, type InterpretContext, type Interpretation } from '../core/ai.ts';
import type { VoiceValues } from './VoiceTalk.tsx';

type Understand = (text: string, id: string) => VoiceValues | string | undefined;

export function aiUnderstand(builtIn: Understand, ctx: InterpretContext, map: (i: Interpretation) => VoiceValues, onChecklist?: (c: Interpretation['checklist']) => void) {
  return async (text: string, id: string): Promise<VoiceValues | string | undefined> => {
    const s = (() => { try { return loadAi(window.localStorage); } catch { return loadAi(); } })();
    if (s.interpreter !== 'slm') return builtIn(text, id);
    const got = await interpret(s, ctx, text, (url, init) => fetch(url, init));
    if (got.checklist) onChecklist?.(got.checklist);
    if (got.source !== 'slm') return builtIn(text, id);
    const values = map(got);
    return Object.keys(values).length ? values : builtIn(text, id);
  };
}

/** A suggested emergency checklist from what was said. One tap opens it; nothing opens by itself. */
export function ChecklistSuggestion({ checklist, onOpen }: { checklist: Interpretation['checklist']; onOpen: (construct: number) => void }) {
  if (!checklist) return null;
  return (
    <div className="x-em-banner" role="alert">
      <svg className="glyph" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><rect x="1" y="1" width="14" height="14" /></svg>
      <div className="x-em-banner-text"><strong>What you said may be an emergency.</strong><span>Suggested: {checklist.name}. {checklist.reason}</span></div>
      <div className="x-em-banner-actions"><button type="button" className="x-em-button" onClick={() => onOpen(checklist.construct)}>Open the checklist</button></div>
    </div>
  );
}
