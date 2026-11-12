import { kmhToKnots } from '@/lib/weather-helpers';

export type GearKind = 'sail' | 'board';

export interface GearItem {
  id: string;
  name: string;
  kind: GearKind;
  size: number;
}

export type GearWarning = 'gusty' | 'lightWind' | 'overpowered';

export interface GearRecommendation {
  windKn: number;
  idealSailM2: number | null;
  sail: GearItem | null;
  altSail: GearItem | null;
  board: GearItem | null;
  warnings: GearWarning[];
}

export const DEFAULT_WEIGHT_KG = 75;

const SAIL_FACTOR = 1.34;
const LIGHT_WIND_KN = 8;
const GUSTY_DIFF_KN = 8;
const OVERPOWERED_MARGIN_M2 = 1;
const BIG_BOARD_BELOW_KN = 12;
const SMALL_BOARD_ABOVE_KN = 20;

function closestBySize(sorted: GearItem[], target: number): GearItem {
  return sorted.reduce((best, it) => (Math.abs(it.size - target) < Math.abs(best.size - target) ? it : best));
}

function pickBoard(boards: GearItem[], windKn: number): GearItem | null {
  if (!boards.length) return null;
  const smallest = boards[0];
  const biggest = boards[boards.length - 1];
  if (boards.length === 1 || windKn < BIG_BOARD_BELOW_KN) return biggest;
  if (windKn > SMALL_BOARD_ABOVE_KN) return smallest;
  // Between the two thresholds the target volume slides from the biggest board to the smallest
  const t = (windKn - BIG_BOARD_BELOW_KN) / (SMALL_BOARD_ABOVE_KN - BIG_BOARD_BELOW_KN);
  return closestBySize(boards, biggest.size - t * (biggest.size - smallest.size));
}

export function recommendGear(
  items: GearItem[],
  windKmh: number,
  gustKmh: number | null,
  weightKg: number,
): GearRecommendation {
  // Whole knots, as shown everywhere else, so the thresholds match what the user reads
  const windKn = Math.round(kmhToKnots(windKmh));
  const gustKn = gustKmh !== null && gustKmh > 0 ? Math.round(kmhToKnots(gustKmh)) : null;
  const bySize = (a: GearItem, b: GearItem) => a.size - b.size;
  const sails = items.filter(i => i.kind === 'sail').sort(bySize);
  const boards = items.filter(i => i.kind === 'board').sort(bySize);

  const idealSailM2 = windKn > 0 ? (weightKg * SAIL_FACTOR) / windKn : null;
  const warnings: GearWarning[] = [];
  let sail: GearItem | null = null;
  let altSail: GearItem | null = null;

  if (windKn < LIGHT_WIND_KN) {
    warnings.push('lightWind');
    sail = sails[sails.length - 1] ?? null;
  } else if (sails.length && idealSailM2 !== null) {
    sail = closestBySize(sails, idealSailM2);
    if (sails[0].size - idealSailM2 > OVERPOWERED_MARGIN_M2) warnings.push('overpowered');
  }

  if (gustKn !== null && gustKn - windKn > GUSTY_DIFF_KN) {
    warnings.push('gusty');
    if (sail) {
      const smaller = sails.filter(s => s.size < sail!.size);
      altSail = smaller[smaller.length - 1] ?? null;
    }
  }

  return { windKn, idealSailM2, sail, altSail, board: pickBoard(boards, windKn), warnings };
}
