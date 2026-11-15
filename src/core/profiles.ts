// Location profiles: where the crew is, its gravity and cabin atmosphere, and what that changes in how things are shown.
// AI assistance: drafted with Claude Code (see AI_USE.md).
import type { Setting, State } from './types.ts';

export interface ProfileFact {
  label: string;
  value: string;
}

/** Rows for display: gravity, cabin atmosphere and how far help is. */
export function profileFacts(setting: Setting): ProfileFact[] {
  const rows: ProfileFact[] = [];
  if (setting.g !== undefined) rows.push({ label: 'Gravity', value: `${setting.g} g` });
  if (setting.cabinKPa !== undefined && setting.o2Pct !== undefined) {
    rows.push({ label: setting.habitat === false ? 'Air' : 'Cabin atmosphere', value: `${setting.cabinKPa} kPa, ${setting.o2Pct}% oxygen` });
  }
  if (setting.away) rows.push({ label: 'How far help is', value: setting.away });
  return rows;
}

/**
 * Body mass from a scale calibrated on Earth: the scale reads weight, so mass is the reading divided by g.
 * Undefined at 0 g, where scales do not work and the body-mass measuring device is used instead.
 */
export function massFromScale(readingKg: number, g: number): number | undefined {
  if (!(g > 0) || !Number.isFinite(readingKg)) return undefined;
  return Math.round((readingKg / g) * 10) / 10;
}

/** Dizziness-on-standing checks mean nothing without gravity, so they are hidden in the zero gravity band. */
export function showDizzinessOnStanding(setting: Setting): boolean {
  return setting.gravityBand !== 'zero';
}

/** Record a change of gravity band when the place changes. Same band, or no band known: the state is returned unchanged. */
export function noteGravityChange(state: State, from: Setting, to: Setting, at: number): State {
  if (!from.gravityBand || !to.gravityBand || from.gravityBand === to.gravityBand) return state;
  return { ...state, ui: { ...state.ui, gravityChange: { from: from.gravityBand, at } } };
}

/** Days of the "adapting to new gravity" period: Act now from the own range is capped at Watch, then the own range is reset from these days. Set by the clinical lead on 15 Nov 2026 (CR-17, CR-48). */
export const ADAPT_DAYS = 7;
const DAY_MS = 86_400_000;

export interface Adapting {
  active: boolean;
  daysLeft: number;
  from: string;
}

/** Whether the person is still inside the adapting period after a gravity change, and how many days are left (rounded up). */
export function adapting(state: State, setting: Setting, now: number): Adapting {
  const change = state.ui.gravityChange;
  if (!change || change.from === setting.gravityBand) return { active: false, daysLeft: 0, from: change?.from ?? '' };
  const left = ADAPT_DAYS * DAY_MS - (now - change.at);
  if (now < change.at || left <= 0) return { active: false, daysLeft: 0, from: change.from };
  return { active: true, daysLeft: Math.ceil(left / DAY_MS), from: change.from };
}

export interface DisplayBand {
  /** Below this, the display shows the reading as low. */
  lo: number;
  /** Below this, the display shows the reading as very low. */
  critLo: number;
  unit: string;
}

export interface DisplayBands {
  oxygenSaturation: DisplayBand;
  /** Absent on Earth: there is no cabin. */
  cabinPressure?: DisplayBand;
  placeholder: true;
  note: string;
}

const NOTE = 'Display bands only. Oxygen saturation never raises an alert by itself.';

/** The oxygen saturation and cabin pressure display bands for this place. Every value is the clinical lead's placeholder (build pack v3.3). */
export function displayBands(setting: Setting): DisplayBands {
  const lowPressureHabitat = setting.cabinKPa === 56.5;
  if (lowPressureHabitat) {
    return { oxygenSaturation: { lo: 92, critLo: 88, unit: '%' }, cabinPressure: { lo: 54, critLo: 50, unit: 'kPa' }, placeholder: true, note: NOTE };
  }
  const bands: DisplayBands = { oxygenSaturation: { lo: 94, critLo: 90, unit: '%' }, placeholder: true, note: NOTE };
  if (setting.gravityBand !== 'earth' && setting.habitat !== false) bands.cabinPressure = { lo: 97, critLo: 90, unit: 'kPa' };
  return bands;
}

export interface Change {
  area: string;
  text: string;
  placeholder: true;
  builtBy: 'emergency module' | 'app';
}

const c = (area: string, text: string, builtBy: Change['builtBy']): Change => ({ area, text, placeholder: true, builtBy });

/** "What changes here": the clinical lead's table (build pack v3.3, section 10) for this gravity band, in plain words. */
export function whatChanges(setting: Setting): Change[] {
  const band = setting.gravityBand;
  if (band === 'zero') {
    return [
      c('Resuscitation', 'Restrain the patient and the rescuer first. Start at once with the rescuer’s legs wrapped around the patient; move to the handstand method once the patient is on the medical restraint system.', 'emergency module'),
      c('Drip (IV) line', 'A drip will not run without gravity: use a pressure infuser. Air bubbles do not rise, so prime the line and check it.', 'emergency module'),
      c('Oxygen display', 'Sea-level display bands: 94 and 90%.', 'app'),
      c('Dizziness on standing', 'Checks are hidden here: they mean nothing without gravity.', 'app'),
      c('Body mass', 'Scales do not work. Use the body-mass measuring device.', 'app'),
      c('Fluid shift', 'Body fluid moves towards the head, which can bring a puffy face, a blocked nose and headache. It links to the eye checks and to fluid and kidney stone risk.', 'app'),
    ];
  }
  if (band === 'lunar' || band === 'martian') {
    const swap = band === 'lunar' ? 'about every minute' : 'every 2 minutes or sooner';
    return [
      c('Resuscitation', `Patient flat, rescuer kneeling. Chest compressions fall short of depth here, so push harder and swap who does them ${swap}.`, 'emergency module'),
      c('Drip (IV) line', 'Drips run slowly: use a pressure infuser to give fluid quickly.', 'emergency module'),
      c('Oxygen display', `Lower display bands at ${setting.cabinKPa ?? 56.5} kPa cabin pressure: 92 and 88%. Never an automatic alert.`, 'app'),
      c('Dizziness on standing', 'Checks are shown.', 'app'),
      c('Body mass', `Scales read weight, not mass: divide the reading by ${setting.g ?? ''} to get mass.`, 'app'),
      c('Fluid shift', 'A partial shift of body fluid towards the head. The evidence is limited.', 'app'),
    ];
  }
  if (band === 'earth') {
    return [
      c('Resuscitation', 'Standard basic life support.', 'emergency module'),
      c('Drip (IV) line', 'Standard.', 'emergency module'),
      c('Oxygen display', 'Sea-level display bands: 94 and 90%.', 'app'),
      c('Dizziness on standing', 'Checks are shown.', 'app'),
      c('Body mass', 'Scales read true.', 'app'),
      c('Fluid shift', 'None.', 'app'),
    ];
  }
  return [];
}
