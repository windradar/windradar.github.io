import type { StationReading } from '@/lib/stations';
import { meanWind } from '@/lib/station-stats';

export type AlertKind = 'offshoreStrong' | 'offshore' | 'gusty' | 'thermal';
export type AlertTone = 'danger' | 'warn' | 'info';

export interface WindAlert {
  kind: AlertKind;
  tone: AlertTone;
  /** gust minus mean wind, kn (gusty only) */
  diffKn?: number;
}

// Wind blowing towards the sea within this angle of the sea bearing is offshore
const OFFSHORE_SECTOR = 60;
// Wind coming from the sea within this angle of the sea bearing is a sea breeze
const ONSHORE_SECTOR = 70;
const OFFSHORE_WARN_KN = 5;
const OFFSHORE_STRONG_KN = 12;
const GUSTY_MIN_MEAN_KN = 6;
const GUSTY_DIFF_KN = 8;
const GUSTY_RATIO = 1.6;
const GUSTY_RATIO_MIN_GUST_KN = 14;
const THERMAL_MIN_KN = 8;
const THERMAL_RISE_KN = 4;

function angleDiff(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

/**
 * Safety and conditions notices for the current reading. seaBearing is the direction
 * of the sea seen from the station, the same convention as the vane.
 */
export function windAlerts(
  reading: StationReading,
  history: StationReading[],
  seaBearing: number,
  now: number,
): WindAlert[] {
  const wind = reading.wind_speed_kn;
  if (wind === null) return [];
  const gust = reading.wind_gust_kn;
  const dir = reading.wind_dir_deg;
  const out: WindAlert[] = [];

  // Wind comes FROM dir, so it blows towards dir + 180
  if (dir !== null && wind >= OFFSHORE_WARN_KN && angleDiff(dir + 180, seaBearing) <= OFFSHORE_SECTOR) {
    out.push(wind >= OFFSHORE_STRONG_KN
      ? { kind: 'offshoreStrong', tone: 'danger' }
      : { kind: 'offshore', tone: 'warn' });
  }

  if (
    gust !== null && wind >= GUSTY_MIN_MEAN_KN
    && (gust - wind >= GUSTY_DIFF_KN || (gust >= GUSTY_RATIO_MIN_GUST_KN && gust / wind >= GUSTY_RATIO))
  ) {
    out.push({ kind: 'gusty', tone: 'warn', diffKn: Math.round(gust - wind) });
  }

  if (dir !== null && wind >= THERMAL_MIN_KN && angleDiff(dir, seaBearing) <= ONSHORE_SECTOR) {
    const recent = meanWind(history, now, 0, 10);
    const before = meanWind(history, now, 20, 30);
    if (recent !== null && before !== null && recent - before >= THERMAL_RISE_KN) {
      out.push({ kind: 'thermal', tone: 'info' });
    }
  }

  return out;
}
