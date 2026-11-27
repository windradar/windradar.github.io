import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, Radio, WifiOff } from 'lucide-react';
import { WindVane } from '@/components/WindVane';
import { useLiveStations, useNow, useStationDayStats, useStationHistory } from '@/hooks/useStations';
import { LANG_LOCALE, windColor } from '@/lib/weather-helpers';
import { WIND_UNIT_LABEL, formatWind, useWindUnit, windFromKnots } from '@/lib/wind-units';
import { STATION_STALE_MIN, knToKmh, readingAgeMin } from '@/lib/stations';
import {
  DIR_CLASS, DIR_KEY, TREND_ARROW, TREND_KEY, dayMax, directionStability, pressureChange3h, startOfLocalDay, windTrend,
} from '@/lib/station-stats';

// Full-screen view for a club or beach monitor: one station, very large numbers,
// screen kept awake. /live uses the featured station; /live?station=<id> picks another.
export default function Live() {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const [params] = useSearchParams();
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const now = useNow(10000);
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);

  const live = useLiveStations();
  const station = useMemo(() => {
    const id = params.get('station');
    return live.stations.find(s => s.id === id)
      ?? live.stations.find(s => s.is_featured)
      ?? live.stations[0]
      ?? null;
  }, [live.stations, params]);
  const history = useStationHistory(station?.id ?? null);
  const dayStats = useStationDayStats(station?.id ?? null);

  const latest = station ? live.latest[station.id] : undefined;
  const reading = useMemo(() => {
    const last = history[history.length - 1];
    if (!last) return latest;
    return !latest || new Date(last.recorded_at) > new Date(latest.recorded_at) ? last : latest;
  }, [history, latest]);

  // Keep the screen on while the page is open (a monitor must not go to sleep)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* not supported or denied */ }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => { /* already released */ });
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* ignore */ });
    else document.documentElement.requestFullscreen().catch(() => { /* ignore */ });
  };

  const ageMin = reading ? readingAgeMin(reading, now) : Infinity;
  const online = !!reading && reading.wind_speed_kn !== null && ageMin <= STATION_STALE_MIN;
  const trend = online ? windTrend(history, now) : null;
  const dirStab = online ? directionStability(history, now) : null;
  const pressureDelta = pressureChange3h(history, now);
  const top = dayMax(history, dayStats, startOfLocalDay(now));
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const show = (kn: number | null) => (kn === null ? '—' : formatWind(windFromKnots(kn, unit), unit));
  const accent = online ? windColor(knToKmh(reading?.wind_speed_kn ?? 0)) : 'hsl(var(--muted-foreground))';
  const ago = ageMin >= 90 ? t('station.agoHour', { n: Math.round(ageMin / 60) }) : t('station.agoMin', { n: Math.floor(ageMin) });

  const bar = (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-8">
      <Link to="/" className="text-muted-foreground transition-colors hover:text-primary" aria-label={t('station.back')} title={t('station.back')}>
        <ArrowLeft className="h-6 w-6" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-xl font-bold sm:text-3xl">{station?.name ?? t('station.title')}</div>
      </div>
      <span className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider sm:text-lg ${online ? 'text-[#44cc88]' : 'text-muted-foreground'}`}>
        {online ? <Radio className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        {online ? t('station.live') : t('station.offline')}
      </span>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="text-muted-foreground transition-colors hover:text-primary"
        aria-label={t('station.fullscreen')}
        title={t('station.fullscreen')}
      >
        {fullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
      </button>
    </div>
  );

  if (!live.loaded || !station || !reading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {bar}
        <div className="flex flex-1 items-center justify-center px-6 text-center text-muted-foreground">
          {!live.loaded
            ? <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            : t('station.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {bar}

      <main className="grid flex-1 grid-cols-1 items-center gap-4 px-4 pb-4 sm:px-8 md:grid-cols-2">
        <div className="mx-auto w-full">
          {reading.wind_dir_deg !== null && (
            <WindVane direction={reading.wind_dir_deg} color={accent} className="mx-auto max-w-[min(70vw,60vh)]" />
          )}
        </div>

        <div className={`text-center md:text-left ${online ? '' : 'opacity-60'}`}>
          <div className="flex items-end justify-center gap-3 md:justify-start">
            <span className="font-mono text-[min(30vw,32vh)] font-bold leading-none" style={{ color: accent }}>
              {show(reading.wind_speed_kn)}
            </span>
            <span className="pb-[2vh] text-[min(6vw,7vh)] text-muted-foreground">{unitLabel}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-8 gap-y-1 text-[min(6vw,6vh)] md:justify-start">
            <span>
              <span className="text-[0.5em] uppercase tracking-wider text-muted-foreground">{t('station.gust')} </span>
              <span className="font-mono font-bold" style={{ color: accent }}>{show(reading.wind_gust_kn)}</span>
            </span>
            {trend && (
              <span className="font-semibold text-foreground/80">
                {TREND_ARROW[trend]} {t(`station.${TREND_KEY[trend]}`)}
              </span>
            )}
          </div>

          {dirStab && (
            <div className={`mt-2 text-[min(3.6vw,3.6vh)] font-semibold ${DIR_CLASS[dirStab.level]}`}>
              {t(`station.${DIR_KEY[dirStab.level]}`)}
              <span className="font-normal text-muted-foreground"> · {t('station.dirSpread', { deg: dirStab.sdDeg })}</span>
            </div>
          )}
          {top && top.windKn !== null && (
            <div className="mt-3 text-[min(3.4vw,3.4vh)] text-muted-foreground">
              {t('station.maxToday')}{' '}
              <span className="font-mono font-semibold text-foreground">{show(top.windKn)} {unitLabel}</span>
              {top.windAt && <> {t('station.at', { time: clock(top.windAt) })}</>}
              {top.gustKn !== null && (
                <>
                  {' · '}{t('station.gust').toLowerCase()}{' '}
                  <span className="font-mono font-semibold text-foreground">{show(top.gustKn)} {unitLabel}</span>
                  {top.gustAt && <> {t('station.at', { time: clock(top.gustAt) })}</>}
                </>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[min(3.6vw,3.4vh)] text-muted-foreground md:justify-start">
            {reading.temp_c !== null && (
              <span>{t('station.temp')} <span className="font-mono text-foreground">{reading.temp_c.toFixed(1)}°</span></span>
            )}
            {reading.humidity !== null && (
              <span>{t('station.humidity')} <span className="font-mono text-foreground">{Math.round(reading.humidity)} %</span></span>
            )}
            {reading.rain_rate_mm !== null && (
              <span>{t('station.rain')} <span className="font-mono text-foreground">{reading.rain_rate_mm.toFixed(1)} mm/h</span></span>
            )}
            {reading.uv_index !== null && (
              <span>{t('station.uv')} <span className="font-mono text-foreground">{reading.uv_index.toFixed(0)}</span></span>
            )}
            {reading.pressure_hpa !== null && (
              <span>
                {t('station.pressure')} <span className="font-mono text-foreground">{Math.round(reading.pressure_hpa)} hPa</span>
                {pressureDelta !== null && (
                  <span className={pressureDelta <= -3 ? 'font-semibold text-amber-500' : ''}>
                    {' '}{pressureDelta > 0 ? '↑' : pressureDelta < 0 ? '↓' : '→'} {Math.abs(pressureDelta).toFixed(1)}/3 h
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {online
              ? (ageMin < 1 ? t('station.now') : t('station.updated', { ago }))
              : t('station.lastSeen', { ago })}
          </div>
        </div>
      </main>
    </div>
  );
}
