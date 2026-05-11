export interface SportType {
  id: string;
  name: string;
  wind_min_kn: number;
  wind_max_kn: number;
}

export interface GearItem {
  id: string;
  name: string;
  photo_url?: string | null;
  wind_min_kn?: number | null;
  wind_max_kn?: number | null;
}

export interface CategoryWithItems {
  id: string;
  slot: number;
  name: string;
  sport_type_id: string | null;
  items: GearItem[];
}

export interface RecommendedItem {
  item: GearItem;
  categoryName: string;
  hasRange: boolean;
  inRange: boolean;
  nearRange: boolean;
}

export interface SportRecommendation {
  sport: SportType;
  items: RecommendedItem[];
}

// ─── Size → wind range tables (standard equipment specs) ──────────────────────

type SizeEntry = { size: number; min: number; max: number };

const WINDSURF: SizeEntry[] = [
  { size: 3.5, min: 22, max: 35 },
  { size: 4.0, min: 18, max: 30 },
  { size: 4.5, min: 16, max: 26 },
  { size: 5.0, min: 13, max: 22 },
  { size: 5.5, min: 11, max: 19 },
  { size: 6.0, min: 10, max: 17 },
  { size: 6.5, min: 9,  max: 15 },
  { size: 7.0, min: 8,  max: 13 },
  { size: 7.5, min: 7,  max: 12 },
  { size: 8.0, min: 6,  max: 11 },
  { size: 9.0, min: 5,  max: 9  },
  { size: 10.0, min: 4, max: 8  },
];

const KITE: SizeEntry[] = [
  { size: 6,  min: 20, max: 35 },
  { size: 8,  min: 16, max: 28 },
  { size: 10, min: 12, max: 21 },
  { size: 12, min: 10, max: 18 },
  { size: 14, min: 8,  max: 15 },
  { size: 17, min: 6,  max: 12 },
  { size: 19, min: 5,  max: 10 },
];

const WING: SizeEntry[] = [
  { size: 3.5, min: 18, max: 35 },
  { size: 4.5, min: 14, max: 28 },
  { size: 5.5, min: 11, max: 22 },
  { size: 6.5, min: 9,  max: 18 },
  { size: 7.0, min: 8,  max: 16 },
];

const SIZE_TABLES: Record<string, SizeEntry[]> = {
  windsurf: WINDSURF, 'wind surf': WINDSURF, vela: WINDSURF,
  kite: KITE, kitesurf: KITE, kiteboard: KITE,
  wing: WING, wingfoil: WING, 'wing foil': WING,
};

/** Calcula el rango de viento para una talla dado el nombre del deporte. */
export function autoRange(sportName: string, size: number): { min: number; max: number } | null {
  const table = SIZE_TABLES[sportName.toLowerCase().trim()];
  if (!table) return null;
  const closest = table.reduce((a, b) =>
    Math.abs(size - a.size) <= Math.abs(size - b.size) ? a : b
  );
  return { min: closest.min, max: closest.max };
}

/** Deportes predefinidos con sus nombres clave. */
export const PRESET_SPORTS = [
  { name: 'Windsurf', wind_min_kn: 8,  wind_max_kn: 35 },
  { name: 'Kite',     wind_min_kn: 8,  wind_max_kn: 35 },
  { name: 'Wing',     wind_min_kn: 8,  wind_max_kn: 35 },
  { name: 'SUP',      wind_min_kn: 5,  wind_max_kn: 20 },
] as const;

/** Devuelve true si el deporte tiene tabla de tallas incorporada. */
export function hasSizeTable(sportName: string): boolean {
  return sportName.toLowerCase().trim() in SIZE_TABLES;
}

// ─── Algoritmo de recomendación ───────────────────────────────────────────────

export function recommendGear(
  windKn: number,
  sports: SportType[],
  categories: CategoryWithItems[],
): SportRecommendation[] {
  const result: SportRecommendation[] = [];

  for (const sport of sports) {
    const sportCats = categories.filter(c => c.sport_type_id === sport.id);
    if (!sportCats.length) continue;

    const items: RecommendedItem[] = [];
    let hasAnyRangedItem = false;

    for (const cat of sportCats) {
      const ranged   = cat.items.filter(i => i.wind_min_kn != null && i.wind_max_kn != null);
      const unranged = cat.items.filter(i => i.wind_min_kn == null || i.wind_max_kn == null);

      if (ranged.length > 0) {
        hasAnyRangedItem = true;

        const matching = ranged.filter(i => windKn >= i.wind_min_kn! && windKn <= i.wind_max_kn!);
        let best: GearItem;
        let inRange: boolean;

        if (matching.length > 0) {
          // El más centrado dentro del rango
          best = matching.reduce((a, b) => {
            const ca = (a.wind_min_kn! + a.wind_max_kn!) / 2;
            const cb = (b.wind_min_kn! + b.wind_max_kn!) / 2;
            return Math.abs(windKn - ca) < Math.abs(windKn - cb) ? a : b;
          });
          inRange = true;
        } else {
          // El más cercano fuera de rango
          best = ranged.reduce((a, b) => {
            const dA = windKn < a.wind_min_kn! ? a.wind_min_kn! - windKn : windKn - a.wind_max_kn!;
            const dB = windKn < b.wind_min_kn! ? b.wind_min_kn! - windKn : windKn - b.wind_max_kn!;
            return dA < dB ? a : b;
          });
          inRange = false;
        }

        const nearRange = !inRange && (
          Math.abs(windKn - best.wind_min_kn!) <= 2 ||
          Math.abs(windKn - best.wind_max_kn!) <= 2
        );

        items.push({ item: best, categoryName: cat.name, hasRange: true, inRange, nearRange });

      } else if (unranged.length > 0) {
        // Categoría sin rangos (tabla, aleta…): mostrar el primero siempre
        items.push({ item: unranged[0], categoryName: cat.name, hasRange: false, inRange: true, nearRange: false });
      }
    }

    if (items.length > 0 && hasAnyRangedItem) {
      result.push({ sport, items });
    }
  }

  return result;
}
