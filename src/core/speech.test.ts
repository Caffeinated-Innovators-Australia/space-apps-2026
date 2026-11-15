// AI assistance: drafted with Claude Code (see AI_USE.md).
import { describe, expect, it } from 'vitest';
import { alertSpeech, normaliseSpeech, parseVitalsUtterance, spokenIntent, spokenNumber, spokenSymptoms, vitalReadBack, vitalSpokenProblem } from './speech.ts';

describe('spoken numbers', () => {
  it.each([
    ['112', 112], ['38.6', 38.6], ['thirty eight point six', 38.6], ['one hundred and twelve', 112], ['a hundred and eighteen', 118],
    ['one eighteen', 118], ['one twenty four', 124], ['ninety four', 94], ['ninety', 90], ['twelve', 12], ['thirty-seven point one', 37.1],
    ['about 96 percent', 96], ['seven and a half hours', 7.5], ['37,5', 37.5],
  ])('%s is %d', (said, n) => expect(spokenNumber(said)).toBe(n));
  it('gives nothing when no number was said', () => expect(spokenNumber('I am not sure')).toBeUndefined());
  it('keeps ordinary words', () => expect(normaliseSpeech('Pulse is one eighteen and steady')).toBe('pulse is 118 and steady'));
});

describe('command words', () => {
  it('reads yes, no, skip, back, stop and repeat', () => {
    expect(spokenIntent('Yes, save it')).toBe('yes');
    expect(spokenIntent('start again')).toBe('no');
    expect(spokenIntent('not measured')).toBe('skip');
    expect(spokenIntent('go back')).toBe('back');
    expect(spokenIntent('stop')).toBe('stop');
    expect(spokenIntent('say that again')).toBe('repeat');
    expect(spokenIntent('ninety four')).toBeUndefined();
  });
});

describe('vital signs in one sentence', () => {
  it('fills every field named', () => {
    expect(parseVitalsUtterance('Temperature 38.6, pulse 118, blood pressure 94 over 56, breathing 24, oxygen 96')).toEqual({ temp: 38.6, hr: 118, sbp: 94, dbp: 56, rr: 24, spo2: 96 });
  });
  it('reads words and a slash', () => {
    expect(parseVitalsUtterance('heart rate one eighteen, BP 94/56, sats ninety six percent')).toEqual({ hr: 118, sbp: 94, dbp: 56, spo2: 96 });
  });
  it('puts a bare number in the field just asked for', () => {
    expect(parseVitalsUtterance('thirty eight point six', 'temp')).toEqual({ temp: 38.6 });
    expect(parseVitalsUtterance('ninety four over fifty six', 'sbp')).toEqual({ sbp: 94, dbp: 56 });
    expect(parseVitalsUtterance('56', 'dbp')).toEqual({ dbp: 56 });
  });
  it('fills nothing from words alone', () => {
    expect(parseVitalsUtterance('I feel hot', 'temp')).toEqual({});
    expect(parseVitalsUtterance('42')).toEqual({});
  });
});

describe('read-back and checks', () => {
  it('reads a value back', () => expect(vitalReadBack('temp', 38.6)).toBe('Temperature 38.6 degrees.'));
  it('refuses a value that cannot be right', () => {
    expect(vitalSpokenProblem('hr', 900)).toMatch(/cannot be right/);
    expect(vitalSpokenProblem('hr', 118)).toBeUndefined();
  });
  it('matches only symptoms on the list', () => {
    expect(spokenSymptoms('I have a fever or chills and pain in the side', ['Fever or chills', 'Pain in the side', 'Confused'])).toEqual(['Fever or chills', 'Pain in the side']);
    expect(spokenSymptoms('my elbow itches', ['Confused'])).toEqual([]);
  });
  it('says an alert with the card\'s own words', () => {
    const said = alertSpeech({ title: 'Possible sepsis: start now', reasons: ['Temperature 38.6 °C'], steps: ['Tell the crew medic.', 'Repeat the vital signs.'] });
    expect(said).toContain('Act now. Possible sepsis: start now. Not a diagnosis.');
    expect(said).toContain('Step 2. Repeat the vital signs.');
  });
});
