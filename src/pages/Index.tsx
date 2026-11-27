import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSelector } from '@/components/LanguageSelector';
import { WindVane } from '@/components/WindVane';
import { RecommendedGearCard } from '@/components/RecommendedGearCard';
import { SearchWithSuggestions } from '@/components/SearchSuggestions';
import { WindCharts } from '@/components/WindCharts';
import { WindCompareChart } from '@/components/WindCompareChart';
import { loadSettings, type AppSettings, type SpotConfig } from '@/components/SettingsPanel';
import { UserMenu } from '@/components/UserMenu';
import { WeekForecastChart } from '@/components/WeekForecastChart';
import { LegalFooter } from '@/components/LegalFooter';
import { WhatsAppShareModal } from '@/components/WhatsAppShareModal';
import { FavoritesButton } from '@/components/FavoritesButton';
import { FavoritesPanel } from '@/components/FavoritesPanel';
import { LiveStationCard } from '@/components/LiveStationCard';
import { StationHistoryCard } from '@/components/StationHistoryCard';
import { StationStatsCard } from '@/components/StationStatsCard';
import { useLiveStations, useNow, useStationDayStats, useStationHistory } from '@/hooks/useStations';
import { dayMax, directionStability, startOfLocalDay, type ForecastPoint } from '@/lib/station-stats';
import { nearestStation, isFresh, knToKmh, type Station } from '@/lib/stations';
import { FAVORITES_SYNCED_EVENT } from '@/lib/favorites-sync';
import { Star, Map as MapIcon, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  type WeatherData, type MarineData,
  windInfo, bft, windColor, waveColor, dirArrow, kmhToKnots,
  WX_ICON, safeNum, localDateStr, humanDate,
  addToSearchHistory, getLastSearch, setLastSearch,
  isFavorite, toggleFavorite, getFavorites, LANG_LOCALE, normalizeArome, windIndex, preferWind100,
} from '@/lib/weather-helpers';
import { windRowStyle } from '@/lib/wind-row-color';
import { useWindUnit, windFromKmh, formatWind, WIND_UNIT_LABEL } from '@/lib/wind-units';
import { findBestWindow } from '@/lib/best-window';
import logoFlow from '@/assets/logo-flow.png';

// "14:00" → "14", "14:30" → "14:30"
function shortHour(hhmm: string): string {
  const h = String(Number(hhmm.slice(0, 2)));
  return hhmm.slice(3) === '00' ? h : `${h}:${hhmm.slice(3)}`;
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

// i18n key for a user-facing message; the raw error goes to the console
function fetchErrorKey(e: unknown, isPastDate: boolean): string {
  console.error('Forecast error:', e);
  if (!navigator.onLine || e instanceof TypeError) return 'index.errors.offline';
  const status = Number(/^HTTP (\d+)/.exec(e instanceof Error ? e.message : '')?.[1]);
  if (status === 429) return 'index.errors.tooMany';
  if (status >= 500) return 'index.errors.server';
  // Open-Meteo answers 400 (or error:true) when the archive has no data for that day yet
  if (isPastDate) return 'index.errors.noArchive';
  return 'index.errors.generic';
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const langLocale = LANG_LOCALE[i18n.language] || 'es-ES';
  const { user } = useAuth();
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const fmtWind = (kmh: number) => formatWind(windFromKmh(kmh, unit), unit);
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [name, setName] = useState('WindFlowRadar');
  const [date, setDate] = useState(localDateStr(new Date()));
  const [wx, setWx] = useState<WeatherData | null>(null);
  const [wxDetail, setWxDetail] = useState<WeatherData | null>(null);
  const [mar, setMar] = useState<MarineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [apiUpdateTime, setApiUpdateTime] = useState<string | null>(null);
  const [favKey, setFavKey] = useState(0);
  const [isFav, setIsFav] = useState(false);
  // favKey changes whenever a favourite is added or removed (they live in localStorage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const favorites = useMemo(() => getFavorites(), [favKey]);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  // Slot picked in the week chart or the hourly table; null = follow the current time
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [tableResolution, setTableResolution] = useState<'1h' | '30min' | '15min'>('1h');

  const today = localDateStr(new Date());
  const minDate = localDateStr(new Date(Date.now() - 7 * 86400000));
  const maxDate = localDateStr(new Date(Date.now() + 6 * 86400000));

  // A slower earlier request (another spot or date) must not overwrite the latest one
  const fetchAbortRef = useRef<AbortController | null>(null);
  // What is on screen once a fetch completes; null while one is in flight
  const loadedRef = useRef<{ lat: number; lon: number; forecast: boolean; day: string } | null>(null);

  const fetchWeather = useCallback(async (latitude: number, longitude: number, selectedDate?: string) => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const { signal } = controller;
    loadedRef.current = null;

    setLoadingText(t('index.loadingText'));
    const targetDate = selectedDate || localDateStr(new Date());
    const isPast = targetDate < localDateStr(new Date());

    if (isPast) {
      setWxDetail(null);
      const wxUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m,precipitation,weathercode,cloud_cover&wind_speed_unit=kmh&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
      const marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,swell_wave_height,sea_surface_temperature&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
      const [wxRes, marRes] = await Promise.all([
        fetch(wxUrl, { signal }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        fetch(marUrl, { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (signal.aborted) return;
      if (wxRes.error) throw new Error(wxRes.reason || 'Forecast API error');
      setApiUpdateTime(wxRes.generationtime_ms ? t('index.generatedIn', { ms: wxRes.generationtime_ms.toFixed(0) }) : null);
      setWx(preferWind100(wxRes));
      setMar(marRes);
    } else {
      // AROME HD 1.3 km 15 min (fallo silencioso) + seamless 7 días + marine
      const aromeUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&minutely_15=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m,precipitation,weather_code&models=meteofrance_arome_france_hd&forecast_days=2&wind_speed_unit=kmh&timezone=auto`;
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m,precipitation,weathercode,cloud_cover&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
      const marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,swell_wave_height,sea_surface_temperature&timezone=auto&forecast_days=7`;
      const [aromeRaw, wxRes, marRes] = await Promise.all([
        fetch(aromeUrl, { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(wxUrl, { signal }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        fetch(marUrl, { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (signal.aborted) return;
      let detail: ReturnType<typeof normalizeArome> | null = null;
      try {
        detail = aromeRaw && !aromeRaw.error ? preferWind100(normalizeArome(aromeRaw)) : null;
      } catch {
        detail = null;
      }
      setWxDetail(detail);
      if (wxRes.error) throw new Error(wxRes.reason || 'Forecast API error');
      setApiUpdateTime(wxRes.generationtime_ms ? t('index.generatedIn', { ms: wxRes.generationtime_ms.toFixed(0) }) : null);
      setWx(preferWind100(wxRes));
      setMar(marRes);
    }

    loadedRef.current = { lat: latitude, lon: longitude, forecast: !isPast, day: localDateStr(new Date()) };
    setLoading(false);
  }, [t]);

  const doSearch = useCallback(async (searchName: string, searchLat: number, searchLon: number) => {
    setError('');
    setSelectedTime(null);
    setLoading(true);
    setWx(null);
    setWxDetail(null);
    try {
      setLat(searchLat);
      setLon(searchLon);
      setName(searchName);
      addToSearchHistory({ name: searchName, lat: searchLat, lon: searchLon });
      setLastSearch({ name: searchName, lat: searchLat, lon: searchLon });
      setIsFav(isFavorite(searchLat, searchLon));
      await fetchWeather(searchLat, searchLon, date);
    } catch (e) {
      if (isAbortError(e)) return;
      setLoading(false);
      setError(t(fetchErrorKey(e, date < localDateStr(new Date()))));
    }
  }, [fetchWeather, date, t]);

  const live = useLiveStations();

  // On entry everyone gets the featured station's spot first. Without one (or if the
  // station list is slow or offline) it falls back to the last search.
  const entryDoneRef = useRef(false);
  const doSearchRef = useRef(doSearch);
  doSearchRef.current = doSearch;
  const runEntry = useCallback((featured: Station | undefined) => {
    if (entryDoneRef.current) return;
    entryDoneRef.current = true;
    if (featured) {
      doSearchRef.current(featured.name, featured.lat, featured.lon);
      return;
    }
    const last = getLastSearch();
    if (last) doSearchRef.current(last.name, last.lat, last.lon);
  }, []);

  useEffect(() => {
    if (live.loaded) runEntry(live.stations.find(s => s.is_featured));
  }, [live.loaded, live.stations, runEntry]);

  useEffect(() => {
    const id = setTimeout(() => runEntry(undefined), 2500);
    return () => {
      clearTimeout(id);
      fetchAbortRef.current?.abort();
    };
  }, [runEntry]);

  // Favourites merged from the account after login
  useEffect(() => {
    const onSynced = () => {
      setFavKey(k => k + 1);
      if (lat !== null && lon !== null) setIsFav(isFavorite(lat, lon));
    };
    window.addEventListener(FAVORITES_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(FAVORITES_SYNCED_EVENT, onSynced);
  }, [lat, lon]);

  // Load WhatsApp number from profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('whatsapp_number').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number); });
  }, [user]);

  const handleToggleFav = useCallback(() => {
    if (lat === null || lon === null) return;
    const nowFav = toggleFavorite({ name, lat, lon });
    setIsFav(nowFav);
    setFavKey(k => k + 1);
    toast(nowFav ? t('index.favAdded', { name }) : t('index.favRemoved', { name }));
  }, [lat, lon, name, t]);

  // Reload data when date changes and we have coordinates
  const handleDateChange = useCallback(async (newDate: string) => {
    setDate(newDate);
    // The 7-day forecast loaded today already covers every non-past date
    const loaded = loadedRef.current;
    const todayStr = localDateStr(new Date());
    if (newDate >= todayStr && loaded?.forecast && loaded.day === todayStr && loaded.lat === lat && loaded.lon === lon) {
      return;
    }
    if (lat !== null && lon !== null) {
      setError('');
      setLoading(true);
      try {
        await fetchWeather(lat, lon, newDate);
      } catch (e) {
        if (isAbortError(e)) return;
        setLoading(false);
        setError(t(fetchErrorKey(e, newDate < localDateStr(new Date()))));
      }
    }
  }, [lat, lon, fetchWeather, t]);

  const handleSelectTime = (time: string) => {
    if (time === selectedTime) { setSelectedTime(null); return; }
    setSelectedTime(time);
    if (time.slice(0, 10) !== date) handleDateChange(time.slice(0, 10));
  };

  // Active data source: AROME when it covers the selected date, else seamless
  const wxDetailCoversDate = !!wxDetail?.hourly.time.some(t => t.slice(0, 10) === date);
  const activeWx = (wxDetailCoversDate ? wxDetail : wx) ?? null;

  // Marine lookup by time (works for both hourly and 15-min AROME indices)
  const marineTimeIndex = useMemo(() => {
    const idx = new Map<string, number>();
    mar?.hourly?.time?.forEach((t, i) => idx.set(t.slice(0, 13), i));
    return idx;
  }, [mar]);

  // Compute table data from active source
  const h = activeWx?.hourly;
  const allDayIdxs = useMemo(() => {
    const idxs: number[] = [];
    h?.time.forEach((t, i) => { if (t.slice(0, 10) === date) idxs.push(i); });
    return idxs;
  }, [h, date]);

  // Seamless indices kept for WhatsApp modal (needs hourly seamless data)
  const allSeamlessDayIdxs = useMemo(() => {
    const idxs: number[] = [];
    wx?.hourly?.time.forEach((t, i) => { if (t.slice(0, 10) === date) idxs.push(i); });
    return idxs;
  }, [wx, date]);

  // Selected day, filtered by settings hour range + selected time resolution
  const dayIdxs = useMemo(() => {
    if (!h) return [];
    return allDayIdxs.filter(i => {
      const t = h.time[i];
      const hr = t.slice(11, 16);
      if (hr < settings.gridFromHour || hr > settings.gridToHour) return false;
      const mm = t.slice(14, 16);
      if (tableResolution === '1h') return mm === '00';
      if (tableResolution === '30min') return mm === '00' || mm === '30';
      return true;
    });
  }, [h, allDayIdxs, settings.gridFromHour, settings.gridToHour, tableResolution]);

  const bestWindow = useMemo(() => {
    if (!h) return null;
    const idxs = allDayIdxs.filter(i => {
      const hr = h.time[i].slice(11, 16);
      return hr >= settings.gridFromHour && hr <= settings.gridToHour;
    });
    return findBestWindow(h, idxs, settings.minWindKn);
  }, [h, allDayIdxs, settings.gridFromHour, settings.gridToHour, settings.minWindKn]);

  let curRow = -1;
  if (h && date === today) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let minDiff = Infinity;
    for (let j = 0; j < dayIdxs.length; j++) {
      const t = h.time[dayIdxs[j]].slice(11, 16);
      const slotMin = parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3, 5));
      const diff = Math.abs(slotMin - nowMin);
      if (diff < minDiff) { minDiff = diff; curRow = j; }
    }
  }
  // allDayIdxs only holds the selected date, so a selection from another day is ignored
  const selI = selectedTime && h
    ? allDayIdxs.find(i => h.time[i] === selectedTime) ?? allDayIdxs.find(i => h.time[i].slice(0, 13) === selectedTime.slice(0, 13))
    : undefined;
  const markRow = selI !== undefined ? dayIdxs.indexOf(selI) : curRow;
  const refI = selI ?? (markRow >= 0 ? dayIdxs[markRow] : (dayIdxs.length > 0 ? dayIdxs[0] : 0));

  // Marine value lookup — uses timestamp to align hourly marine with any source resolution
  const marVal = (key: keyof MarineData['hourly'], i: number): number | null => {
    if (!h || !mar?.hourly) return null;
    const hourKey = h.time[i]?.slice(0, 13);
    if (!hourKey) return null;
    const marI = marineTimeIndex.get(hourKey) ?? -1;
    if (marI < 0) return null;
    const arr = mar.hourly[key] as (number | null)[];
    const v = arr[marI];
    return v !== undefined && v !== null ? v : null;
  };

  // Card data
  const cardData = h ? (() => {
    const ws = h.wind_speed_10m[refI] || 0;
    const wd = h.wind_direction_10m[refI] || 0;
    const wg = h.wind_gusts_10m[refI] || 0;
    const wh = marVal('wave_height', refI) || 0;
    const swh = marVal('swell_wave_height', refI);
    const sst = marVal('sea_surface_temperature', refI);
    const temp = h.temperature_2m[refI];
    const code = h.weathercode[refI] || 0;
    const prec = h.precipitation[refI] || 0;
    const b = bft(ws);
    const wi = windInfo(wd);
    const bftColors = ['#7bb8d8','#7bb8d8','#44cc88','#44cc88','#ffcc44','#ffcc44','#ff8c00','#ff8c00','#ff5533','#ff5533','#ff3366','#ff3366','#ff3366'];
    return { ws, wd, wg, wh, swh, sst, temp, code, prec, b, wi, bftColor: bftColors[b[0]] };
  })() : null;

  const matchedSpot = useMemo<SpotConfig | null>(() => {
    if (!settings.spots?.length) return null;
    if (lat !== null && lon !== null) {
      let nearest: SpotConfig | null = null;
      let nearestD = Infinity;
      for (const s of settings.spots) {
        if (s.lat == null || s.lon == null) continue;
        const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
        if (d < nearestD) { nearestD = d; nearest = s; }
      }
      if (nearest && nearestD < 0.0081) return nearest;
    }
    if (!name) return null;
    const accentRx = new RegExp('[̀-ͯ]', 'g');
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(accentRx, '').trim();
    const firstToken = (s: string) => strip(s).split(',')[0].split(' ')[0];
    const nameToken = firstToken(name);
    const normName = strip(name);
    return settings.spots.find(s => {
      if (!s.location) return false;
      if (firstToken(s.location) === nameToken) return true;
      const normLoc = strip(s.location);
      return normName.includes(normLoc) || normLoc.includes(normName);
    }) ?? null;
  }, [lat, lon, name, settings.spots]);

  const liveStation = useMemo(
    () => (lat !== null && lon !== null ? nearestStation(live.stations, lat, lon) : null),
    [live.stations, lat, lon],
  );
  const nowTick = useNow();
  const featuredStation = useMemo(() => live.stations.find(s => s.is_featured) ?? null, [live.stations]);
  const featuredOnline = featuredStation ? isFresh(live.latest[featuredStation.id], nowTick) : false;
  const stationHistory = useStationHistory(liveStation?.id ?? null);
  const stationDay = useStationDayStats(liveStation?.id ?? null);
  const forecastPoints = useMemo<ForecastPoint[]>(() => {
    if (!h) return [];
    const pts: ForecastPoint[] = [];
    for (let i = 0; i < h.time.length; i++) {
      // Open-Meteo times have no zone: they are the spot's local time
      const t = new Date(h.time[i]).getTime();
      const kmh = h.wind_speed_10m[i];
      if (Number.isFinite(t) && kmh != null) pts.push({ t, kmh });
    }
    return pts.sort((a, b) => a.t - b.t);
  }, [h]);
  // The top cards show "now": real station data replaces the forecast only when the
  // spot has a fresh reading, today is selected and no other hour was picked
  const liveReading = liveStation ? live.latest[liveStation.id] : undefined;
  const real = isFresh(liveReading, nowTick) && date === today && selI === undefined ? liveReading : null;
  const top = cardData ? (() => {
    if (!real) return { ...cardData, gustKmh: h?.wind_gusts_10m[refI] ?? null, isReal: false, humidity: null, uv: null };
    const ws = knToKmh(real.wind_speed_kn ?? 0);
    const wg = real.wind_gust_kn !== null ? knToKmh(real.wind_gust_kn) : ws;
    return {
      ...cardData,
      ws, wg,
      wd: real.wind_dir_deg ?? cardData.wd,
      temp: real.temp_c ?? cardData.temp,
      prec: real.rain_rate_mm ?? cardData.prec,
      gustKmh: wg,
      isReal: true,
      humidity: real.humidity,
      uv: real.uv_index,
    };
  })() : null;
  const dayTop = real ? dayMax(stationHistory, stationDay, startOfLocalDay(nowTick)) : null;
  const dirStabTop = real ? directionStability(stationHistory, nowTick) : null;

  const isBigDay = useMemo(() => {
    const hourly = wx?.hourly;
    if (!hourly) return false;
    const dayIdxsAll: number[] = [];
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i].slice(0, 10) === today) dayIdxsAll.push(i);
    }
    if (dayIdxsAll.length < 2) return false;
    const thresholdKn = matchedSpot?.minWindKn ?? settings.minWindKn;
    const thresholdKmh = thresholdKn * 1.852;
    const neededSlots = 2;
    let streak = 0;
    for (const idx of dayIdxsAll) {
      if ((hourly.wind_speed_10m[idx] || 0) >= thresholdKmh) {
        if (++streak >= neededSlots) return true;
      } else { streak = 0; }
    }
    return false;
  }, [wx, today, matchedSpot, settings.minWindKn]);

  const dateInput = (
    <input
      type="date"
      value={date}
      min={minDate}
      max={maxDate}
      onChange={e => { setSelectedTime(null); handleDateChange(e.target.value); }}
      aria-label={t('index.dateLabel')}
      className="h-[42px] w-[132px] rounded-lg border border-border bg-secondary px-2 font-mono text-[0.78rem] text-foreground outline-none focus:border-primary sm:w-auto sm:px-2.5"
    />
  );

  return (
    <div className="relative z-[1] min-h-screen">
      {/* Top progress bar: loading no longer blocks the page (header and search stay usable) */}
      <AnimatePresence>
        {loading && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="progressbar"
            aria-label={loadingText}
            className="fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/20"
          >
            <div className="h-full w-1/3 animate-loadbar bg-primary" />
          </m.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1300px] px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <img src={logoFlow} alt="WindFlowRadar" className="h-8 w-8 rounded-full sm:h-9 sm:w-9" />
              <span className="hidden md:inline font-display text-base font-extrabold tracking-tight sm:text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">WindFlowRadar</span>
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <SearchWithSuggestions onSelect={doSearch} showLocate />
            </div>
            <Link
              to={lat !== null && lon !== null ? `/map?lat=${lat}&lon=${lon}` : '/map'}
              aria-label={t('map.title')}
              title={t('map.title')}
              className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <MapIcon className="h-4 w-4" />
            </Link>
            <FavoritesButton
              onSelect={doSearch}
              refreshKey={favKey}
              currentSpot={lat !== null && lon !== null ? { name, lat, lon } : null}
              onFavChanged={() => {
                if (lat !== null && lon !== null) setIsFav(isFavorite(lat, lon));
                setFavKey(k => k + 1);
              }}
            />
            <div className="hidden sm:block">{dateInput}</div>
            <div className="flex-1 sm:hidden" />
            <ThemeSelector />
            <LanguageSelector />
            <UserMenu
              settings={settings}
              onSettingsChange={setSettings}
              onShareWhatsapp={wx ? () => setWhatsappModalOpen(true) : undefined}
            />
          </div>
          {/* Mobile: search and date get their own row instead of squeezing into the first one */}
          <div className="mt-2 flex items-center gap-2 sm:hidden">
            <div className="min-w-0 flex-1">
              <SearchWithSuggestions onSelect={doSearch} showLocate />
            </div>
            {dateInput}
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        aria-busy={loading}
        className={`relative z-[1] mx-auto max-w-[1300px] px-3 py-4 transition-opacity duration-200 sm:py-6 md:px-5 ${loading && wx ? 'opacity-60' : ''}`}
      >
        {/* Location bar */}
        <div className="mb-4 flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">{name}</h1>
          {lat !== null && (
            <button
              onClick={handleToggleFav}
              aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
              aria-pressed={isFav}
              title={isFav ? t('favorites.remove') : t('favorites.add')}
              className={`self-center inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] font-medium transition-colors ${isFav ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20' : 'border-border bg-secondary text-muted-foreground hover:border-accent/40 hover:text-accent'}`}
            >
              <Star className="h-3.5 w-3.5" fill={isFav ? 'currentColor' : 'none'} />
              <span>{isFav ? t('index.favLabel') : t('index.favAdd')}</span>
            </button>
          )}
          {lat !== null && (
            <span className="text-[0.65rem] text-muted-foreground sm:text-[0.7rem]">
              {lat.toFixed(4)}°N {Math.abs(lon!).toFixed(4)}°{lon! < 0 ? 'O' : 'E'}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {(() => {
              const pill = 'rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-primary sm:px-2.5 sm:text-[0.65rem]';
              const label = wx ? t('index.live') : t('index.ready');
              // With a featured station the pill opens its full-screen live view
              return featuredStation ? (
                <Link
                  to="/live"
                  title={t('station.liveButton', { name: featuredStation.name })}
                  aria-label={t('station.liveButton', { name: featuredStation.name })}
                  className="flex items-center gap-2 rounded-full border border-[#44cc88]/60 bg-[#44cc88]/10 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-widest text-[#44cc88] shadow-[0_0_12px_rgba(68,204,136,0.25)] transition-all hover:border-[#44cc88] hover:bg-[#44cc88]/20 hover:shadow-[0_0_16px_rgba(68,204,136,0.45)] sm:px-3.5 sm:py-1.5 sm:text-xs"
                >
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <Radio className="h-4 w-4" />
                    {featuredOnline && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[#44cc88]" aria-hidden />}
                  </span>
                  {label}
                </Link>
              ) : (
                <span className={pill}>{label}</span>
              );
            })()}
            {isBigDay && (
              <m.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 rounded-full border border-[#ffcc44]/60 bg-[#ffcc44]/10 px-3 py-1"
              >
                <img src={logoFlow} className="h-4 w-4 rounded-full" alt="" />
                <m.span
                  animate={{ opacity: [1, 1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity, times: [0, 0.88, 0.9, 1], ease: 'linear' }}
                  className="font-bold tracking-wide text-[#ffcc44]"
                >
                  {matchedSpot?.name ? t('index.bigDayAt', { name: matchedSpot.name }) : t('index.bigDay')}
                </m.span>
              </m.div>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="min-w-0 flex-1">⚠️ {error}</span>
            {lat !== null && lon !== null && (
              <button
                onClick={() => handleDateChange(date)}
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-bold hover:bg-destructive/10"
              >
                {t('index.errors.retry')}
              </button>
            )}
          </div>
        )}

        <FavoritesPanel
          favorites={favorites}
          thresholdKn={settings.minWindKn}
          fromHour={settings.gridFromHour}
          toHour={settings.gridToHour}
          currentLat={lat}
          currentLon={lon}
          onSelect={doSearch}
          live={live}
        />

        <SectionTitle>{t('index.conditionsTitle')}</SectionTitle>

        {!wx && loading ? (
          <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-10">
            <div className="h-9 w-9 rounded-full border-[3px] border-border border-t-primary animate-spin" />
            <div className="text-xs tracking-widest text-muted-foreground">{loadingText}</div>
          </div>
        ) : !wx ? (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground sm:p-8">
              {t('index.searchPrompt')}
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 px-4 py-3">
              <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">{t('index.appDesc')}</p>
              <ul className="grid grid-cols-2 gap-1.5 text-[0.68rem] text-muted-foreground/70 sm:grid-cols-4">
                {[t('index.featureWind'), t('index.featureForecast'), t('index.featureWave'), t('index.featureShare')].map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : top && (
          <>
          {top.isReal && liveStation && (
            <div className="mb-2 flex items-center gap-2 text-[0.7rem] text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#44cc88]" aria-hidden />
              <span className="font-bold uppercase tracking-wider text-[#44cc88]">{t('station.live')}</span>
              <span>{t('station.realBanner', { name: liveStation.name })}</span>
            </div>
          )}
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4">
            <div className="col-span-2 sm:col-span-1 lg:row-span-2">
              <WindVane
                direction={top.wd}
                color={windColor(top.ws)}
                seaBearing={top.isReal && liveStation ? liveStation.sea_bearing : undefined}
                wobbleDeg={top.isReal && dirStabTop ? Math.min(20, dirStabTop.sdDeg) : 0}
              />
            </div>
            <WindWidget
              ws={top.ws} wd={top.wd} wg={top.wg}
              wsMin={!top.isReal && h && allDayIdxs.length ? Math.min(...allDayIdxs.map(i => h.wind_speed_10m[i] || 0)) : null}
              extra={dayTop?.windKn != null ? `${t('station.maxShort')} ${fmtWind(knToKmh(dayTop.windKn))} ${unitLabel}` : null}
              color={windColor(top.ws)}
            />
            <RecommendedGearCard windKmh={top.ws} gustKmh={top.gustKmh} />
            <NowCard label={t('index.waveCard')} value={cardData.wh ? cardData.wh.toFixed(1) : '—'} unit="m" sub={t('index.swell', { value: cardData.swh !== null ? cardData.swh.toFixed(1) + ' m' : '—' })} color={waveColor(cardData.wh)} />
            <m.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="relative flex flex-col justify-center overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:p-5"
            >
              <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t('index.tempCard')}</div>
              <div className="flex items-end gap-3 sm:gap-5">
                <div>
                  <div className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground/60">{t('index.air')}</div>
                  <div className="font-display text-3xl font-bold leading-none sm:text-4xl lg:text-5xl">
                    {safeNum(top.temp, 1)}<span className="ml-0.5 text-sm font-normal text-muted-foreground sm:text-base"> °C</span>
                  </div>
                </div>
                {cardData.sst !== null && (
                  <>
                    <span className="mb-1.5 text-xl text-muted-foreground/40">·</span>
                    <div>
                      <div className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground/60">{t('index.water')}</div>
                      <div className="font-display text-3xl font-bold leading-none sm:text-4xl lg:text-5xl" style={{ color: '#4dd9ff' }}>
                        {safeNum(cardData.sst, 1)}<span className="ml-0.5 text-sm font-normal text-muted-foreground sm:text-base"> °C</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {top.humidity !== null && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {t('station.humidity')} <span className="font-mono text-foreground">{Math.round(top.humidity)} %</span>
                </div>
              )}
            </m.div>
            <NowCard
              label={t('index.weatherCard')} value={WX_ICON[cardData.code] || '🌡️'} isEmoji
              sub={`${t(`wmo.${cardData.code}`)}${top.uv !== null ? ` · UV ${top.uv.toFixed(0)}` : ''}`}
            />
            <NowCard
              label={t('index.precipCard')} value={top.prec.toFixed(1)}
              unit={top.isReal ? 'mm/h' : 'mm'} sub={top.isReal ? t('station.rainNow') : t('index.lastHour')}
            />
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <WeekForecastChart wx={wx} mar={mar} wxDetail={wxDetail} selectedTime={selI !== undefined ? selectedTime : null} onSelectTime={handleSelectTime} />
            </div>
          </div>
          </>
        )}

        {/* Actions row */}

        {/* Table */}
        <SectionTitle>{t('index.hourlyTitle')} — {humanDate(date, langLocale)}</SectionTitle>
        {bestWindow && (
          <div
            className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3.5 py-2.5 text-sm ${
              bestWindow.kind === 'window' ? 'border-[#44cc88]/50 bg-[#44cc88]/10' : 'border-border bg-card'
            }`}
          >
            <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground">
              {bestWindow.kind === 'window' ? t('index.bestWindow') : t('index.bestWindowNone', { kn: settings.minWindKn })}
            </span>
            {bestWindow.kind === 'window' ? (
              <span className="font-semibold text-foreground">
                {t('index.bestWindowRange', {
                  from: shortHour(bestWindow.start),
                  to: shortHour(bestWindow.end),
                })}
                {' · '}
                <span style={{ color: windColor(bestWindow.maxKmh) }}>
                  {fmtWind(bestWindow.minKmh) === fmtWind(bestWindow.maxKmh)
                    ? fmtWind(bestWindow.maxKmh)
                    : `${fmtWind(bestWindow.minKmh)}–${fmtWind(bestWindow.maxKmh)}`} {unitLabel}
                </span>
                {' '}{t('index.bestWindowFrom', { dir: windInfo(bestWindow.dirDeg).short })}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {t('index.bestWindowGust', { gust: fmtWind(bestWindow.gustKmh), unit: unitLabel })}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t('index.bestWindowMax', { speed: fmtWind(bestWindow.maxKmh), unit: unitLabel, hour: shortHour(bestWindow.maxAt) })}
              </span>
            )}
          </div>
        )}
        {wxDetailCoversDate && (
          <div role="group" aria-labelledby="table-resolution-label" className="mb-2.5 flex items-center gap-1">
            <span id="table-resolution-label" className="text-[0.62rem] uppercase tracking-widest text-muted-foreground mr-1">{t('index.interval')}</span>
            {(['1h', '30min', '15min'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTableResolution(r)}
                aria-pressed={tableResolution === r}
                className={`min-h-[34px] rounded-md border px-3 py-1.5 font-mono text-[0.72rem] transition-colors ${tableResolution === r ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'}`}
              >
                {r}
              </button>
            ))}
            <span className="ml-1.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[0.62rem] uppercase tracking-widest text-primary">AROME HD</span>
          </div>
        )}

        {/* Desktop table */}
        <div className="mb-6 hidden overflow-x-auto rounded-lg border border-border md:block">
          <table className="w-full min-w-[850px] border-collapse font-mono text-[0.88rem]">
            <thead>
              <tr className="bg-secondary">
                {[t('index.tableHour'),t('index.tableAir'),t('index.tableWater'),t('index.tableWind100', { unit: unitLabel }),t('index.tableGust', { unit: unitLabel }),t('index.tableDir'),t('index.tableName'),t('index.tableWave'),t('index.tableWaveDir'),t('index.tableWeather'),t('index.tablePrecip'),t('index.tableBft')].map(th => (
                  <th key={th} className="whitespace-nowrap border-b border-border px-2.5 py-2.5 text-center text-[0.6rem] font-medium uppercase tracking-widest text-muted-foreground">{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!h || dayIdxs.length === 0 ? (
                <tr><td colSpan={12} className="py-7 text-center text-sm text-muted-foreground">{t('index.noDataTable')}</td></tr>
              ) : dayIdxs.map((idx, ri) => {
                const ws = h.wind_speed_10m[idx] || 0;
                const wd = h.wind_direction_10m[idx] || 0;
                const wg = h.wind_gusts_10m[idx] || 0;
                const wh = marVal('wave_height', idx) || 0;
                const wd2 = marVal('wave_direction', idx);
                const sst = marVal('sea_surface_temperature', idx);
                const temp = h.temperature_2m[idx];
                const code = h.weathercode[idx] || 0;
                const prec = h.precipitation[idx] || 0;
                const b = bft(ws);
                const wi = windInfo(wd);
                const wdir2 = wd2 !== null ? windInfo(wd2).short : '—';
                const hour = h.time[idx].slice(11, 16);
                const isCur = ri === markRow;

                const knots = Math.round(kmhToKnots(ws));
                const rowStyle = windRowStyle(knots, settings.minWindKn);

                return (
                  <tr key={idx} onClick={() => handleSelectTime(h.time[idx])} style={rowStyle.backgroundColor ? { backgroundColor: rowStyle.backgroundColor } : undefined} className={`cursor-pointer border-b border-border/40 transition-colors ${!rowStyle.backgroundColor ? 'hover:bg-primary/[0.03]' : ''} ${isCur ? 'ring-1 ring-primary' : ''}`}>
                    <td className={`py-2.5 pl-3.5 text-left ${isCur ? 'border-l-2 border-primary' : ''}`} style={rowStyle.color ? { color: rowStyle.color } : undefined}>{isCur ? '▶ ' : ''}{hour}</td>
                    <td className="text-center" style={{ color: rowStyle.color || undefined }}>{safeNum(temp, 1)}°</td>
                    <td className="text-center font-medium" style={{ color: rowStyle.color || '#0ea5e9' }}>{safeNum(sst, 1)}°</td>
                    <td className="text-center font-bold text-[0.95rem]" style={{ color: rowStyle.color || windColor(ws) }}>{fmtWind(ws)}</td>
                    <td className="text-center font-semibold" style={{ color: rowStyle.color || windColor(wg) }}>{fmtWind(wg)}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}>{dirArrow(wd)} {wi.short} <span className="text-[0.72rem]">{Math.round(wd)}°</span></td>
                    <td className="text-center" style={{ color: rowStyle.color || windColor(ws) }}>{t(`wind.names.${windIndex(wd)}`)}</td>
                    <td className="text-center font-medium" style={{ color: rowStyle.color || waveColor(wh) }}>{wh ? wh.toFixed(1) + 'm' : '—'}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}>{wdir2}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}>{WX_ICON[code] || ''} <span className="text-[0.75rem]">{t(`wmo.${code}`)}</span></td>
                    <td className="text-center" style={{ color: rowStyle.color || (prec > 0.5 ? '#4dd9ff' : undefined) }}>{prec.toFixed(1)}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}><span className="font-bold">{b[0]}</span> <span className="text-[0.75rem]">{t(`bft.${b[0]}`)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile hourly cards */}
        <div className="mb-6 space-y-2 md:hidden">
          {!h || dayIdxs.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">{t('index.noDataShort')}</div>
          ) : dayIdxs.map((idx, ri) => {
            const ws = h.wind_speed_10m[idx] || 0;
            const wd = h.wind_direction_10m[idx] || 0;
            const wg = h.wind_gusts_10m[idx] || 0;
            const wh = marVal('wave_height', idx) || 0;
            const sst = marVal('sea_surface_temperature', idx);
            const temp = h.temperature_2m[idx];
            const code = h.weathercode[idx] || 0;
            const prec = h.precipitation[idx] || 0;
            const b = bft(ws);
            const wi = windInfo(wd);
            const hour = h.time[idx].slice(11, 16);
            const isCur = ri === markRow;
            const mobileKnots = Math.round(kmhToKnots(ws));
            const mobileRowStyle = windRowStyle(mobileKnots, settings.minWindKn);

            return (
              <div key={idx} onClick={() => handleSelectTime(h.time[idx])} className={`cursor-pointer rounded-lg border p-3 ${isCur ? 'border-primary/50' : 'border-border'}`} style={{ backgroundColor: mobileRowStyle.backgroundColor || undefined, color: mobileRowStyle.color || undefined }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-foreground">{isCur ? '▶ ' : ''}{hour}</span>
                  <span className="text-lg">{WX_ICON[code] || ''}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[0.82rem]">
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">💨 </span>
                    <span className="font-bold text-[0.9rem]" style={{ color: windColor(ws) }}>{fmtWind(ws)} {unitLabel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">⚡ </span>
                    <span className="font-semibold text-[0.9rem]" style={{ color: windColor(wg) }}>{fmtWind(wg)} {unitLabel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">🧭 </span>
                    <span className="font-medium">{dirArrow(wd)} {wi.short}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">🌊 </span>
                    <span className="font-medium" style={{ color: waveColor(wh) }}>{wh ? wh.toFixed(1) + 'm' : '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">🌡️ </span>
                    <span>{safeNum(temp, 1)}°</span>
                    {sst !== null && <span className="font-medium" style={{ color: '#0ea5e9' }}> / {safeNum(sst, 1)}°</span>}
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: windColor(ws) }}>BFT {b[0]}</span>
                    {prec > 0 && <span className="text-muted-foreground"> · ☔{prec.toFixed(1)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {liveStation && (
          <>
          <LiveStationCard
            station={liveStation}
            latest={live.latest[liveStation.id]}
            history={stationHistory}
            dayStats={stationDay}
            forecast={forecastPoints}
            forecastKmh={h && date === today && curRow >= 0 ? (h.wind_speed_10m[dayIdxs[curRow]] ?? null) : null}
          />
          <StationHistoryCard station={liveStation} />
          <StationStatsCard station={liveStation} />
          </>
        )}

        {/* Charts */}
        {wx && (
          <>
            <SectionTitle>{t('index.chartsTitle')}</SectionTitle>
            <div className="mb-6 grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <WindCharts wx={wx} mar={mar} wxDetail={wxDetail} />
              {lat !== null && lon !== null && (
                <WindCompareChart lat={lat} lon={lon} wxDetail={wxDetail} />
              )}
            </div>
          </>
        )}

        <div className="pb-4 text-center text-[0.6rem] tracking-wider text-muted-foreground sm:text-[0.65rem]">
          {t('index.dataSource')}
          {apiUpdateTime && <span className="ml-2">· 🕐 {apiUpdateTime}</span>}
        </div>
      </main>
      <LegalFooter />

      {wx && (
        <WhatsAppShareModal
          open={whatsappModalOpen}
          onOpenChange={setWhatsappModalOpen}
          wx={wx}
          mar={mar}
          name={name}
          date={date}
          dayIdxs={allSeamlessDayIdxs}
          whatsappNumber={whatsappNumber}
        />
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

function WindWidget({ ws, wd, wg, wsMin, color, extra }: {
  ws: number; wd: number; wg: number; wsMin: number | null; color: string; extra?: string | null;
}) {
  const { t } = useTranslation();
  const wi = windInfo(wd);
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const avg = formatWind(windFromKmh(ws, unit), unit);
  const gust = formatWind(windFromKmh(wg, unit), unit);
  const min = wsMin !== null ? formatWind(windFromKmh(wsMin, unit), unit) : null;
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col justify-center overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:p-5"
    >
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
      <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{t('index.windCard')}</div>
      <div className="flex items-center gap-3 sm:gap-4">
        <svg viewBox="0 0 60 60" className="h-14 w-14 flex-shrink-0 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
          <circle cx={30} cy={30} r={27} stroke={color} strokeWidth="1" fill="none" strokeOpacity="0.2" />
          <g transform="translate(30,30)">
            <m.g
              initial={{ rotate: 0 }}
              animate={{ rotate: wd + 180 }}
              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
              style={{ transformOrigin: '0px 0px' }}
            >
              <line x1={0} y1={18} x2={0} y2={-16} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="0,-24 -6,-13 6,-13" fill={color} />
              <line x1={-5} y1={20} x2={5} y2={20} stroke={color} strokeWidth="2" strokeLinecap="round" />
            </m.g>
          </g>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="font-display text-3xl font-bold leading-none sm:text-4xl lg:text-5xl" style={{ color }}>
            {avg}<span className="ml-1 text-sm font-normal text-muted-foreground sm:text-base">{unitLabel}</span>
          </div>
          <div className="mt-1.5 text-sm font-medium text-foreground/80 sm:text-base">{wi.short} · {Math.round(wd)}°</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
            <span>↑ {gust} {unitLabel}</span>
            {min !== null && <span>↓ {min} {unitLabel}</span>}
            {extra && <span>{extra}</span>}
          </div>
        </div>
      </div>
    </m.div>
  );
}

function NowCard({ label, value, unit, sub, color, highlight, isEmoji }: {
  label: string; value: string; unit?: string; sub?: string; color?: string; highlight?: boolean; isEmoji?: boolean;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col justify-center overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:p-5"
    >
      <div className={`absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent ${highlight ? 'opacity-100' : 'opacity-30'}`} />
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display font-bold leading-none ${isEmoji ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`} style={color ? { color } : undefined}>
        {value}{unit && <span className="text-sm font-normal text-muted-foreground sm:text-base"> {unit}</span>}
      </div>
      {sub && <div className="mt-2 text-xs text-muted-foreground sm:text-sm">{sub}</div>}
    </m.div>
  );
}

