import { useSyncExternalStore } from 'react';

export type WindUnit = 'kn' | 'kmh' | 'ms';

const STORAGE_KEY = 'windradar_wind_units';

export const WIND_UNIT_LABEL: Record<WindUnit, string> = { kn: 'kn', kmh: 'km/h', ms: 'm/s' };

function isWindUnit(v: unknown): v is WindUnit {
  return v === 'kn' || v === 'kmh' || v === 'ms';
}

function readStored(): WindUnit {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isWindUnit(v) ? v : 'kn';
  } catch {
    return 'kn';
  }
}

// Module store instead of a React context: canvas code (story cards) reads it too.
// The profile value is mirrored in localStorage so the unit applies before the
// profile loads and when offline.
let current: WindUnit = readStored();
const listeners = new Set<() => void>();

export function getWindUnit(): WindUnit {
  return current;
}

export function setWindUnit(unit: unknown) {
  const next = isWindUnit(unit) ? unit : 'kn';
  if (next === current) return;
  current = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* sin almacenamiento */ }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useWindUnit(): WindUnit {
  return useSyncExternalStore(subscribe, getWindUnit, getWindUnit);
}

function round(v: number, unit: WindUnit): number {
  return unit === 'ms' ? Math.round(v * 10) / 10 : Math.round(v);
}

/** Unrounded conversion from km/h, for charts */
export function convertKmh(kmh: number, unit: WindUnit = current): number {
  if (unit === 'kmh') return kmh;
  if (unit === 'ms') return kmh / 3.6;
  return kmh / 1.852;
}

/** Wind speed from km/h (Open-Meteo) to the given unit, rounded for display */
export function windFromKmh(kmh: number, unit: WindUnit = current): number {
  return round(convertKmh(kmh, unit), unit);
}

/** Wind speed from knots (session snapshots) to the given unit, rounded for display */
export function windFromKnots(kn: number, unit: WindUnit = current): number {
  return windFromKmh(kn * 1.852, unit);
}

export function formatWind(value: number, unit: WindUnit = current): string {
  return unit === 'ms' ? value.toFixed(1).replace('.', ',') : String(value);
}
