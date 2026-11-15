// Connected devices: the crew's device kit, the readers for the published Bluetooth health formats, and a simulated kit for the demo.
// AI assistance: drafted with Claude Code (see AI_USE.md).
// Pure functions. A device supplies numbers; it never sets a tier. The numbers go through the same checks and rules as typed ones.
import type { VitalSigns } from './types.ts';
import type { VitalField } from './vitals.ts';

export interface DeviceInfo {
  id: string;
  name: string;
  /** What it is modelled on, in plain words. No maker's name. */
  kind: string;
  measures: VitalField[];
  /** The published Bluetooth service and measurement it speaks, where one exists. Numbers are the Bluetooth assigned numbers. */
  bluetooth?: { service: number; characteristic: number; format: 'heart-rate' | 'temperature' | 'blood-pressure' | 'pulse-oximeter'; name: string };
}

/**
 * The kit the app assumes a crew carries: what a smartwatch-class wearable gives, plus the instruments in a crew medical kit.
 * In the demo every reading from it is SYNTHETIC.
 */
export const DEVICE_KIT: DeviceInfo[] = [
  { id: 'wearable', name: 'Wrist wearable', kind: 'A smartwatch-class wearable, worn all day', measures: ['hr', 'spo2'], bluetooth: { service: 0x180d, characteristic: 0x2a37, format: 'heart-rate', name: 'Heart Rate' } },
  { id: 'vest', name: 'Sensor vest', kind: 'A sensor garment worn under clothing', measures: ['hr', 'rr'] },
  { id: 'cuff', name: 'Blood pressure cuff', kind: 'An automatic upper-arm cuff from the medical kit', measures: ['sbp', 'dbp'], bluetooth: { service: 0x1810, characteristic: 0x2a35, format: 'blood-pressure', name: 'Blood Pressure' } },
  { id: 'thermometer', name: 'Thermometer', kind: 'A clinical thermometer from the medical kit', measures: ['temp'], bluetooth: { service: 0x1809, characteristic: 0x2a1c, format: 'temperature', name: 'Health Thermometer' } },
  { id: 'oximeter', name: 'Fingertip pulse oximeter', kind: 'A fingertip clip from the medical kit', measures: ['spo2', 'hr'], bluetooth: { service: 0x1822, characteristic: 0x2a5e, format: 'pulse-oximeter', name: 'Pulse Oximeter' } },
];

export const deviceById = (id: string): DeviceInfo | undefined => DEVICE_KIT.find((d) => d.id === id);

/** What one simulated device reads, given the demo set it is "measuring". Only the values that device measures. */
export function simulatedReading(device: DeviceInfo, set: VitalSigns): VitalSigns {
  const out: VitalSigns = {};
  for (const f of device.measures) if (set[f] !== undefined) out[f] = set[f];
  return out;
}

/** One reading from the whole simulated kit: every value, and which device supplied it (the first device that measures it). */
export function simulatedKitReading(set: VitalSigns, kit: DeviceInfo[] = DEVICE_KIT): { values: VitalSigns; from: Partial<Record<VitalField, string>> } {
  const values: VitalSigns = {};
  const from: Partial<Record<VitalField, string>> = {};
  for (const d of kit) {
    const r = simulatedReading(d, set);
    for (const f of d.measures) if (r[f] !== undefined && values[f] === undefined) { values[f] = r[f]; from[f] = d.name; }
  }
  return { values, from };
}

// ---- Readers for the published Bluetooth formats. Each takes the raw bytes a device sends and returns plain numbers. ----

/** The 16-bit medical number format (IEEE 11073 SFLOAT): 12-bit mantissa, 4-bit power of ten. Undefined for "no value". */
export function sfloat(view: DataView, offset: number): number | undefined {
  const raw = view.getUint16(offset, true);
  let mantissa = raw & 0x0fff;
  let exponent = raw >> 12;
  if (mantissa === 0x07ff || mantissa === 0x0800 || mantissa === 0x07fe || mantissa === 0x0802 || mantissa === 0x0801) return undefined;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exponent >= 0x8) exponent -= 0x10;
  return Number((mantissa * 10 ** exponent).toFixed(Math.max(0, -exponent)));
}

/** The 32-bit medical number format (IEEE 11073 FLOAT): 24-bit mantissa, 8-bit power of ten. */
export function float32(view: DataView, offset: number): number | undefined {
  const raw = view.getUint32(offset, true);
  let mantissa = raw & 0x00ffffff;
  let exponent = raw >>> 24;
  if (mantissa === 0x7fffff || mantissa === 0x800000 || mantissa === 0x7ffffe || mantissa === 0x800002 || mantissa === 0x800001) return undefined;
  if (mantissa >= 0x800000) mantissa -= 0x1000000;
  if (exponent >= 0x80) exponent -= 0x100;
  return Number((mantissa * 10 ** exponent).toFixed(Math.max(0, -exponent)));
}

/** Heart Rate Measurement: a flag byte, then the rate as one byte or two. */
export function parseHeartRate(view: DataView): VitalSigns {
  if (view.byteLength < 2) return {};
  const wide = (view.getUint8(0) & 0x01) === 1;
  if (wide && view.byteLength < 3) return {};
  return { hr: wide ? view.getUint16(1, true) : view.getUint8(1) };
}

/** Temperature Measurement: a flag byte (Celsius or Fahrenheit), then the temperature. Always returned in degrees Celsius. */
export function parseTemperature(view: DataView): VitalSigns {
  if (view.byteLength < 5) return {};
  const v = float32(view, 1);
  if (v === undefined) return {};
  const fahrenheit = (view.getUint8(0) & 0x01) === 1;
  return { temp: Number((fahrenheit ? (v - 32) / 1.8 : v).toFixed(1)) };
}

/** Blood Pressure Measurement: a flag byte (mmHg or kPa), then upper, lower and mean, then an optional time and pulse. Returned in mmHg. */
export function parseBloodPressure(view: DataView): VitalSigns {
  if (view.byteLength < 7) return {};
  const flags = view.getUint8(0);
  const k = (flags & 0x01) === 1 ? 7.50062 : 1;
  const sbp = sfloat(view, 1);
  const dbp = sfloat(view, 3);
  const out: VitalSigns = {};
  if (sbp !== undefined) out.sbp = Math.round(sbp * k);
  if (dbp !== undefined) out.dbp = Math.round(dbp * k);
  const pulseAt = 7 + ((flags & 0x02) ? 7 : 0);
  if ((flags & 0x04) && view.byteLength >= pulseAt + 2) { const hr = sfloat(view, pulseAt); if (hr !== undefined) out.hr = Math.round(hr); }
  return out;
}

/** Pulse oximeter spot-check: a flag byte, then oxygen saturation and pulse. */
export function parsePulseOximeter(view: DataView): VitalSigns {
  if (view.byteLength < 5) return {};
  const spo2 = sfloat(view, 1);
  const hr = sfloat(view, 3);
  const out: VitalSigns = {};
  if (spo2 !== undefined) out.spo2 = Math.round(spo2);
  if (hr !== undefined) out.hr = Math.round(hr);
  return out;
}

/** Read one measurement in the device's own format. */
export function parseMeasurement(format: NonNullable<DeviceInfo['bluetooth']>['format'], view: DataView): VitalSigns {
  if (format === 'heart-rate') return parseHeartRate(view);
  if (format === 'temperature') return parseTemperature(view);
  if (format === 'blood-pressure') return parseBloodPressure(view);
  return parsePulseOximeter(view);
}
