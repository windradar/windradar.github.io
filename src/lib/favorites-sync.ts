import { supabase } from '@/integrations/supabase/client';
import {
  type FavoriteSpot, type FavoriteOp, FAVORITE_OP_EVENT, getFavorites, setFavorites,
} from '@/lib/weather-helpers';

/** Fired after the account favourites are merged into the local list */
export const FAVORITES_SYNCED_EVENT = 'windradar-favorites-synced';

// Per-device marker: the first sync of an account merges local and remote;
// later ones treat the account as the source of truth, so a favourite removed
// on another device does not come back from this one.
const SYNCED_KEY = 'windradar_favorites_synced_user';

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const coordKey = (f: { lat: number; lon: number }) => `${r4(f.lat)},${r4(f.lon)}`;

let syncedUserId: string | null = null;

function toRow(userId: string, f: FavoriteSpot) {
  return { user_id: userId, name: f.name.slice(0, 200), lat: r4(f.lat), lon: r4(f.lon), added_at: new Date(f.addedAt || Date.now()).toISOString() };
}

export async function syncFavorites(userId: string) {
  const { data, error } = await supabase.from('user_favorites')
    .select('name, lat, lon, added_at').order('added_at', { ascending: false });
  if (error) { console.error('Favorites sync:', error.message); return; }

  const remote: FavoriteSpot[] = (data ?? []).map(r => ({
    name: r.name, lat: Number(r.lat), lon: Number(r.lon), addedAt: Date.parse(r.added_at),
  }));

  let firstSync = true;
  try { firstSync = localStorage.getItem(SYNCED_KEY) !== userId; } catch { /* sin almacenamiento */ }

  let merged = remote;
  if (firstSync) {
    const byKey = new Map(remote.map(f => [coordKey(f), f]));
    const toUpload = getFavorites().filter(f => !byKey.has(coordKey(f)));
    if (toUpload.length) {
      const { error: upError } = await supabase.from('user_favorites')
        .upsert(toUpload.map(f => toRow(userId, f)), { onConflict: 'user_id,lat,lon' });
      if (upError) { console.error('Favorites upload:', upError.message); return; }
    }
    merged = [...remote, ...toUpload].sort((a, b) => b.addedAt - a.addedAt);
  }

  setFavorites(merged);
  try { localStorage.setItem(SYNCED_KEY, userId); } catch { /* sin almacenamiento */ }
  syncedUserId = userId;
  window.dispatchEvent(new Event(FAVORITES_SYNCED_EVENT));
}

export function stopFavoritesSync() {
  syncedUserId = null;
}

async function mirror(op: FavoriteOp) {
  const userId = syncedUserId;
  if (!userId) return;
  if (op.op === 'add') {
    const { error } = await supabase.from('user_favorites')
      .upsert(toRow(userId, op.fav), { onConflict: 'user_id,lat,lon' });
    if (error) console.error('Favorite add:', error.message);
  } else {
    // Range instead of equality: the local copy may keep more decimals than the account
    const { error } = await supabase.from('user_favorites').delete()
      .eq('user_id', userId)
      .gte('lat', r4(op.lat) - 1e-4).lte('lat', r4(op.lat) + 1e-4)
      .gte('lon', r4(op.lon) - 1e-4).lte('lon', r4(op.lon) + 1e-4);
    if (error) console.error('Favorite remove:', error.message);
  }
}

window.addEventListener(FAVORITE_OP_EVENT, e => { void mirror((e as CustomEvent<FavoriteOp>).detail); });
