// AI assistance: drafted with Claude Code (see AI_USE.md).
// The example bytes follow the published Bluetooth formats for each measurement.
import { describe, expect, it } from 'vitest';
import { DEVICE_KIT, deviceById, float32, parseBloodPressure, parseHeartRate, parseMeasurement, parsePulseOximeter, parseTemperature, sfloat, simulatedKitReading, simulatedReading } from './devices.ts';
import { VITAL_FIELDS, recordVitals, vitalsSourceLine, latestVitals } from './vitals.ts';
import type { State } from './types.ts';

const bytes = (...b: number[]) => new DataView(new Uint8Array(b).buffer);

describe('the medical number formats', () => {
  it('reads a 16-bit value', () => {
    expect(sfloat(bytes(0x5e, 0x00), 0)).toBe(94);
    expect(sfloat(bytes(0x72, 0xf1), 0)).toBe(37); // 370 x 10^-1
    expect(sfloat(bytes(0xff, 0x07), 0)).toBeUndefined();
  });
  it('reads a 32-bit value', () => {
    expect(float32(bytes(0x82, 0x01, 0x00, 0xff), 0)).toBe(38.6); // 386 x 10^-1
    expect(float32(bytes(0xff, 0xff, 0x7f, 0x00), 0)).toBeUndefined();
  });
});

describe('the Bluetooth measurement readers', () => {
  it('reads a heart rate as one byte or two', () => {
    expect(parseHeartRate(bytes(0x00, 118))).toEqual({ hr: 118 });
    expect(parseHeartRate(bytes(0x01, 0x76, 0x00))).toEqual({ hr: 118 });
    expect(parseHeartRate(bytes(0x00))).toEqual({});
  });
  it('reads a temperature in Celsius or Fahrenheit', () => {
    expect(parseTemperature(bytes(0x00, 0x82, 0x01, 0x00, 0xff))).toEqual({ temp: 38.6 });
    expect(parseTemperature(bytes(0x01, 0xf7, 0x03, 0x00, 0xff))).toEqual({ temp: 38.6 }); // 101.5 °F
  });
  it('reads a blood pressure in mmHg or kPa, with the pulse when sent', () => {
    expect(parseBloodPressure(bytes(0x00, 94, 0, 56, 0, 69, 0))).toEqual({ sbp: 94, dbp: 56 });
    expect(parseBloodPressure(bytes(0x04, 94, 0, 56, 0, 69, 0, 118, 0))).toEqual({ sbp: 94, dbp: 56, hr: 118 });
    expect(parseBloodPressure(bytes(0x01, 0x7d, 0xf0, 0x4b, 0xf0, 0x5c, 0xf0))).toEqual({ sbp: 94, dbp: 56 }); // 12.5 and 7.5 kPa
  });
  it('reads a pulse oximeter', () => {
    expect(parsePulseOximeter(bytes(0x00, 96, 0, 118, 0))).toEqual({ spo2: 96, hr: 118 });
    expect(parseMeasurement('pulse-oximeter', bytes(0x00, 96, 0, 118, 0))).toEqual({ spo2: 96, hr: 118 });
  });
  it('gives nothing for a short or empty message', () => {
    expect(parseTemperature(bytes(0x00))).toEqual({});
    expect(parseBloodPressure(bytes(0x00, 1))).toEqual({});
  });
});

describe('the simulated kit', () => {
  const set = { temp: 38.6, hr: 118, sbp: 94, dbp: 56, rr: 24, spo2: 96 };
  it('covers every vital sign between its devices', () => {
    const measured = new Set(DEVICE_KIT.flatMap((d) => d.measures));
    for (const f of VITAL_FIELDS) expect(measured.has(f.id)).toBe(true);
  });
  it('gives each device only what it measures', () => {
    expect(simulatedReading(deviceById('cuff')!, set)).toEqual({ sbp: 94, dbp: 56 });
    expect(simulatedReading(deviceById('thermometer')!, set)).toEqual({ temp: 38.6 });
  });
  it('reads the whole kit and says which device gave each value', () => {
    const r = simulatedKitReading(set);
    expect(r.values).toEqual(set);
    expect(r.from.hr).toBe('Wrist wearable');
    expect(r.from.rr).toBe('Sensor vest');
  });
  it('names no maker', () => {
    for (const d of DEVICE_KIT) expect(`${d.name} ${d.kind}`).not.toMatch(/apple|garmin|fitbit|polar|omron|nasa/i);
  });
});

describe('where each value came from', () => {
  it('is kept with the set and written as one line', () => {
    const s = recordVitals({ vitals: [] } as unknown as State, { crewId: 'c1', at: 1, values: { temp: 38.6, hr: 118, sbp: 94 }, sources: { temp: 'voice', hr: 'device', sbp: 'typed', spo2: 'device' } });
    const e = latestVitals(s, 'c1')!;
    expect(e.sources).toEqual({ temp: 'voice', hr: 'device', sbp: 'typed' });
    expect(vitalsSourceLine(e)).toBe('From a device: pulse. By voice: temperature. Typed: blood pressure.');
  });
  it('is left out when nothing was noted', () => {
    const s = recordVitals({ vitals: [] } as unknown as State, { crewId: 'c1', at: 1, values: { hr: 80 } });
    expect(latestVitals(s, 'c1')!.sources).toBeUndefined();
    expect(vitalsSourceLine(latestVitals(s, 'c1')!)).toBeUndefined();
  });
});
