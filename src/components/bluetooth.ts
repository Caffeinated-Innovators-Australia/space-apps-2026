// Read one measurement from a real Bluetooth device, where the browser allows it (Chrome and Edge on a computer or Android).
// AI assistance: drafted with Claude Code (see AI_USE.md).
// The browser shows its own device chooser; the app sees only the device the person picks. The bytes are read by the
// tested readers in src/core/devices.ts.
import { parseMeasurement, type DeviceInfo } from '../core/devices.ts';
import type { VitalSigns } from '../core/types.ts';

interface Characteristic {
  startNotifications(): Promise<unknown>;
  addEventListener(type: 'characteristicvaluechanged', fn: (e: { target: { value?: DataView } }) => void): void;
}
interface GattServer { connect(): Promise<GattServer>; disconnect(): void; getPrimaryService(s: number): Promise<{ getCharacteristic(c: number): Promise<Characteristic> }> }
interface BluetoothApi { requestDevice(o: { filters: { services: number[] }[] }): Promise<{ name?: string; gatt?: GattServer }> }

const api = (): BluetoothApi | undefined => (typeof navigator === 'undefined' ? undefined : (navigator as unknown as { bluetooth?: BluetoothApi }).bluetooth);
export const bluetoothAvailable = (): boolean => Boolean(api());

/** Ask the person to pick a device, wait for its next measurement, and return it. */
export async function readBluetooth(device: DeviceInfo, timeoutMs = 30_000): Promise<{ values: VitalSigns; name: string }> {
  const bt = api();
  if (!bt || !device.bluetooth) throw new Error('Bluetooth is not available in this browser.');
  const { service, characteristic, format } = device.bluetooth;
  const picked = await bt.requestDevice({ filters: [{ services: [service] }] });
  if (!picked.gatt) throw new Error('That device cannot be read.');
  const server = await picked.gatt.connect();
  try {
    const ch = await (await server.getPrimaryService(service)).getCharacteristic(characteristic);
    const values = await new Promise<VitalSigns>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No measurement arrived. Take a reading on the device and try again.')), timeoutMs);
      ch.addEventListener('characteristicvaluechanged', (e) => {
        const v = e.target.value ? parseMeasurement(format, e.target.value) : {};
        if (Object.keys(v).length) { clearTimeout(timer); resolve(v); }
      });
      ch.startNotifications().catch((err) => { clearTimeout(timer); reject(err); });
    });
    return { values, name: picked.name || device.name };
  } finally {
    try { server.disconnect(); } catch { /* ignore */ }
  }
}
