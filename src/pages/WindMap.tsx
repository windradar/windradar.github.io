import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, LocateFixed, Loader2, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useWindUnit, windFromKmh, formatWind, WIND_UNIT_LABEL, type WindUnit } from '@/lib/wind-units';
import { windColor, windInfo, getFavorites, getLastSearch, setLastSearch, localDateStr } from '@/lib/weather-helpers';
import { fetchWindPoints, gridPoints, type Bounds, type WindHour, type WindPointsResult } from '@/lib/wind-points';
import { locateUser, type GeolocateError } from '@/lib/geolocate';

const DEFAULT_CENTER: [number, number] = [40.2, -3.7];
// OpenStreetMap needs no API key (CARTO now watermarks keyless tiles on published sites).
// Dark themes get a CSS filter on the tile pane instead of a separate dark tile set.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Open-Meteo';
// windColor() breakpoints in km/h, for the legend
const LEGEND_KMH = [0, 10, 20, 35, 50, 65];
const LOCATE_ERROR_KEY: Record<GeolocateError, string> = {
  unsupported: 'search.locateUnsupported',
  denied: 'search.locateDenied',
  unavailable: 'search.locateUnavailable',
};

// Arrow pointing where the wind blows to (+180°), like every other arrow in the app
function arrowIcon(w: WindHour, unit: WindUnit, label: string): L.DivIcon {
  const color = windColor(w.speedKmh);
  const value = formatWind(windFromKmh(w.speedKmh, unit), unit);
  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<div class="wm-arrow" role="img" aria-label="${label}">
      <svg viewBox="-12 -12 24 24" width="26" height="26" style="transform:rotate(${w.dirDeg + 180}deg)">
        <path d="M0,-10 L6,4 L0,1 L-6,4 Z" fill="${color}" stroke="rgba(0,0,0,.55)" stroke-width="1"/>
      </svg>
      <span style="color:${color}">${value}</span>
    </div>`,
  });
}

function favoriteIcon(name: string, w: WindHour | null, unit: WindUnit): L.DivIcon {
  const value = w ? `${formatWind(windFromKmh(w.speedKmh, unit), unit)} ${WIND_UNIT_LABEL[unit]}` : '—';
  const color = w ? windColor(w.speedKmh) : 'currentColor';
  const safe = name.replace(/[<>&"]/g, '');
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div class="wm-fav"><span class="wm-star">★</span><b>${safe}</b><span style="color:${color}">${value}</span></div>`,
  });
}

function initialView(): { center: [number, number]; zoom: number } {
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  if (params.get('lat') && Number.isFinite(lat) && Number.isFinite(lon)) return { center: [lat, lon], zoom: 9 };
  const last = getLastSearch();
  if (last) return { center: [last.lat, last.lon], zoom: 9 };
  const fav = getFavorites()[0];
  if (fav) return { center: [fav.lat, fav.lon], zoom: 9 };
  return { center: DEFAULT_CENTER, zoom: 6 };
}

/** Reports the visible area once the map is ready and after every pan/zoom */
function ViewWatcher({ onView }: { onView: (b: Bounds, size: L.Point) => void }) {
  const map = useMap();
  const report = useCallback(() => {
    const b = map.getBounds();
    onView({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }, map.getSize());
  }, [map, onView]);
  useEffect(() => { report(); }, [report]);
  useMapEvents({ moveend: report });
  return null;
}

function MapHandle({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

export default function WindMap() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const mode = useThemeMode();
  const unit = useWindUnit();
  const [view] = useState(initialView);
  const [grid, setGrid] = useState<{ display: { lat: number; lon: number }[]; data: WindPointsResult } | null>(null);
  const [favWind, setFavWind] = useState<WindPointsResult | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number>();
  const favorites = useMemo(() => getFavorites(), []);

  const onView = useCallback((b: Bounds, size: L.Point) => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      // ~1 arrow every 90 px, at most 10×10 so one request stays small
      const cols = Math.min(10, Math.max(4, Math.round(size.x / 90)));
      const rows = Math.min(10, Math.max(4, Math.round(size.y / 90)));
      const display = gridPoints(b, rows, cols);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const data = await fetchWindPoints(display, controller.signal);
        setGrid({ display, data });
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Wind map:', e);
          toast.error(t('map.loadError'));
        }
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    }, 400);
  }, [t]);

  useEffect(() => () => { window.clearTimeout(debounceRef.current); abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (!favorites.length) return;
    const controller = new AbortController();
    fetchWindPoints(favorites, controller.signal).then(setFavWind).catch(() => { /* favourites are optional */ });
    return () => controller.abort();
  }, [favorites]);

  const times = useMemo(() => grid?.data.times ?? favWind?.times ?? [], [grid, favWind]);

  // Start on the current hour once the first data arrives
  useEffect(() => {
    if (hour !== null || !times.length) return;
    const now = new Date();
    const key = `${localDateStr(now)}T${String(now.getHours()).padStart(2, '0')}`;
    const idx = times.findIndex(x => x.slice(0, 13) === key);
    setHour(idx >= 0 ? idx : 0);
  }, [times, hour]);

  const h = hour ?? 0;
  const time = times[h];
  const today = times[0]?.slice(0, 10);
  const dayLabel = time && time.slice(0, 10) !== today ? t('favPanel.tomorrow') : t('favPanel.today');
  const hasArome = grid?.data.points.some(p => p.hours[h]?.source === 'arome') ?? false;

  const arrows = useMemo(() => {
    if (!grid) return [];
    return grid.data.points.map((p, k) => {
      const w = p.hours[h];
      if (!w) return null;
      const label = t('map.arrowLabel', {
        speed: formatWind(windFromKmh(w.speedKmh, unit), unit), unit: WIND_UNIT_LABEL[unit], dir: windInfo(w.dirDeg).short,
      });
      return { pos: grid.display[k], icon: arrowIcon(w, unit, label), key: `${grid.display[k].lat},${grid.display[k].lon}` };
    }).filter(Boolean) as { pos: { lat: number; lon: number }; icon: L.DivIcon; key: string }[];
    // i18n.language: arrow labels follow the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, h, unit, t, i18n.language]);

  const openSpot = (name: string, lat: number, lon: number) => {
    setLastSearch({ name, lat, lon });
    navigate('/');
  };

  const handleLocate = async () => {
    setLocating(true);
    try {
      const place = await locateUser(i18n.language, t('search.myLocation'));
      mapRef.current?.flyTo([place.lat, place.lon], Math.max(mapRef.current.getZoom(), 9));
    } catch (e) {
      toast.error(t(LOCATE_ERROR_KEY[e as GeolocateError] ?? 'search.locateUnavailable'));
    } finally {
      setLocating(false);
    }
  };

  const onMapReady = useCallback((map: L.Map) => { mapRef.current = map; }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="z-[500] flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
        <Link to="/" className="flex h-10 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={15} /> {t('common.back')}
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-display text-sm font-extrabold">
          <MapIcon size={16} className="text-primary" aria-hidden /> {t('map.title')}
        </h1>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t('common.loading')} />}
        <button
          onClick={handleLocate}
          disabled={locating}
          aria-label={t('search.locate')}
          title={t('search.locate')}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapContainer
          center={view.center}
          zoom={view.zoom}
          minZoom={4}
          maxZoom={13}
          worldCopyJump
          className="h-full w-full"
          style={{ background: mode === 'dark' ? '#0b1220' : '#e8edf2' }}
        >
          <TileLayer url={TILE_URL} attribution={ATTRIBUTION} className={mode === 'dark' ? 'wm-tiles-dark' : ''} />
          <ViewWatcher onView={onView} />
          <MapHandle onReady={onMapReady} />
          {arrows.map(a => (
            <Marker key={a.key} position={[a.pos.lat, a.pos.lon]} icon={a.icon} interactive={false} keyboard={false} />
          ))}
          {favorites.map((f, i) => {
            const w = favWind?.points[i]?.hours[h] ?? null;
            return (
              <Marker key={`fav-${f.lat},${f.lon}`} position={[f.lat, f.lon]} icon={favoriteIcon(f.name.split(',')[0], w, unit)}>
                <Popup>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-bold">{f.name}</p>
                    {w && (
                      <p>
                        {formatWind(windFromKmh(w.speedKmh, unit), unit)} {WIND_UNIT_LABEL[unit]}
                        {' · '}{t('share.gustAbbr')} {formatWind(windFromKmh(w.gustKmh, unit), unit)}
                        {' · '}{windInfo(w.dirDeg).short}
                      </p>
                    )}
                    <button
                      onClick={() => openSpot(f.name, f.lat, f.lon)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      {t('map.openForecast')}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="z-[500] space-y-2 border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <label htmlFor="wm-hour" className="w-[7.5rem] shrink-0 font-mono text-sm font-bold text-foreground">
            {time ? `${dayLabel} ${time.slice(11, 16)}` : '—'}
          </label>
          <input
            id="wm-hour"
            type="range"
            min={0}
            max={Math.max(0, times.length - 1)}
            value={h}
            onChange={e => setHour(Number(e.target.value))}
            disabled={!times.length}
            aria-valuetext={time ? `${dayLabel} ${time.slice(11, 16)}` : undefined}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--primary))]"
          />
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${hasArome ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
            {hasArome ? 'AROME HD' : t('map.globalModel')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[0.65rem] text-muted-foreground" aria-label={t('map.legend')}>
          <span>{t('map.legend')} ({WIND_UNIT_LABEL[unit]}):</span>
          {LEGEND_KMH.map(kmh => (
            <span key={kmh} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: windColor(kmh + 0.1) }} />
              {formatWind(windFromKmh(kmh, unit), unit)}+
            </span>
          ))}
          <span className="ml-auto hidden sm:inline">{t('map.hint')}</span>
        </div>
      </div>
    </div>
  );
}
