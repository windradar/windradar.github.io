import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Maximize2, Radio, Share2, WifiOff } from 'lucide-react';
import { WindVane } from '@/components/WindVane';
import { WindAlerts } from '@/components/WindAlerts';
import { StationWindChart } from '@/components/StationWindChart';
import { useNow } from '@/hooks/useStations';
import { windColor, windInfo, LANG_LOCALE } from '@/lib/weather-helpers';
import { useWindUnit, windFromKnots, windFromKmh, formatWind, WIND_UNIT_LABEL } from '@/lib/wind-units';
import { STATION_STALE_MIN, knToKmh, readingAgeMin, type Station, type StationReading } from '@/lib/stations';
import {
  DIR_CLASS, DIR_KEY, TREND_ARROW, TREND_KEY, dayMax, directionStability, pressureChange3h, startOfLocalDay, windTrend,
  type DayStats, type ForecastPoint,
} from '@/lib/station-stats';
import { windAlerts } from '@/lib/station-alerts';
import { shareText } from '@/lib/share-text';

interface Props {
  station: Station;
  latest: StationReading | undefined;
  /** Readings of the last 6 h, oldest first */
  history: StationReading[];
  /** Highest wind and gust since midnight, from the database */
  dayStats: DayStats | null;
  /** Forecast wind for the current hour, km/h (same series as the rest of the page) */
  forecastKmh: number | null;
  /** Hourly forecast wind of the spot, drawn over the real wind in the chart */
  forecast: ForecastPoint[];
}

export const LiveStationCard = memo(function LiveStationCard({ station, latest, history, dayStats, forecastKmh, forecast }: Props) {
  const { t, i18n } = useTranslation();
  const locale = LANG_LOCALE[i18n.language] || 'es-ES';
  const unit = useWindUnit();
  const unitLabel = WIND_UNIT_LABEL[unit];
  const now = useNow();

  const reading = useMemo(() => {
    // A reading can arrive through Realtime before the history query finishes
    const last = history[history.length - 1];
    if (!last) return latest;
    return !latest || new Date(last.recorded_at) > new Date(latest.recorded_at) ? last : latest;
  }, [history, latest]);

  const ageMin = reading ? readingAgeMin(reading, now) : Infinity;
  const online = !!reading && reading.wind_speed_kn !== null && ageMin <= STATION_STALE_MIN;

  const trend = useMemo(() => (online ? windTrend(history, now) : null), [history, now, online]);
  const dirStab = useMemo(() => (online ? directionStability(history, now) : null), [history, now, online]);
  const alerts = useMemo(
    () => (online && reading ? windAlerts(reading, history, station.sea_bearing, now) : []),
    [online, reading, history, station.sea_bearing, now],
  );
  const pressureDelta = useMemo(() => pressureChange3h(history, now), [history, now]);
  const dayTop = useMemo(
    () => dayMax(history, dayStats, startOfLocalDay(now)),
    [history, dayStats, now],
  );

  const agoLabel = (min: number) => {
    const m = Math.floor(min);
    return m >= 90 ? t('station.agoHour', { n: Math.round(m / 60) }) : t('station.agoMin', { n: m });
  };
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (!reading) return null;

  const hasWind = reading.wind_speed_kn !== null;
  const speedKmh = knToKmh(reading.wind_speed_kn ?? 0);
  const accent = online ? windColor(speedKmh) : 'hsl(var(--muted-foreground))';
  const show = (kn: number | null) => (kn === null ? '—' : formatWind(windFromKnots(kn, unit), unit));
  const pressureDrop = pressureDelta !== null && pressureDelta <= -3;

  const handleShare = () => {
    if (!hasWind) return;
    const text = t('station.shareText', {
      name: station.name,
      wind: show(reading.wind_speed_kn),
      gust: show(reading.wind_gust_kn ?? reading.wind_speed_kn),
      unit: unitLabel,
      dir: reading.wind_dir_deg !== null ? windInfo(reading.wind_dir_deg).short : '—',
    });
    void shareText(text, `${window.location.origin}/live`, t('station.shareCopied'));
  };

  return (
    <section
      className="mb-6 rounded-lg border border-border bg-card p-4"
      aria-label={t('station.title')}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {online ? <Radio className="h-3 w-3 text-[#44cc88]" /> : <WifiOff className="h-3 w-3" />}
          {t('station.title')}
        </div>
        <span className="truncate text-xs text-muted-foreground">{station.name}</span>
        <span
          className={`ml-auto flex items-center gap-1.5 text-[0.65rem] ${online ? 'font-semibold text-[#44cc88]' : 'text-muted-foreground'}`}
          role="status"
        >
          {online && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#44cc88]" aria-hidden />}
          {online
            ? (ageMin < 1 ? t('station.now') : t('station.updated', { ago: agoLabel(ageMin) }))
            : t('station.offline')}
        </span>
        {hasWind && (
          <button
            type="button"
            onClick={handleShare}
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label={t('station.share')}
            title={t('station.share')}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        )}
        <Link
          to="/live"
          className="text-muted-foreground transition-colors hover:text-primary"
          aria-label={t('station.openLive')}
          title={t('station.openLive')}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className={`grid grid-cols-1 items-center gap-4 sm:grid-cols-[170px_1fr] ${online ? '' : 'opacity-60'}`}>
        <div className="mx-auto w-full max-w-[170px]">
          {reading.wind_dir_deg !== null && (
            <WindVane
              direction={reading.wind_dir_deg}
              seaBearing={station.sea_bearing}
              color={accent}
              wobbleDeg={dirStab ? Math.min(20, dirStab.sdDeg) : 0}
            />
          )}
        </div>

        <div>
          <div className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('station.wind')}</div>
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="font-mono text-5xl font-bold leading-none" style={{ color: accent }}>
              {show(reading.wind_speed_kn)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">{unitLabel}</span>
            {trend && (
              <span className="pb-1 text-sm font-semibold text-foreground/80">
                {TREND_ARROW[trend]} {t(`station.${TREND_KEY[trend]}`)}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">{t('station.gust')} </span>
              <span className="font-mono font-bold" style={{ color: accent }}>{show(reading.wind_gust_kn)}</span>
              <span className="text-[0.62rem] text-muted-foreground"> {unitLabel}</span>
            </span>
            {online && forecastKmh !== null && hasWind && (
              <span className="text-xs text-muted-foreground">
                {t('station.vsForecast', {
                  real: formatWind(windFromKnots(reading.wind_speed_kn!, unit), unit),
                  forecast: formatWind(windFromKmh(forecastKmh, unit), unit),
                  unit: unitLabel,
                })}
              </span>
            )}
          </div>
          {dirStab && (
            <div className={`mt-1 text-xs font-semibold ${DIR_CLASS[dirStab.level]}`}>
              {t(`station.${DIR_KEY[dirStab.level]}`)}
              <span className="font-normal text-muted-foreground"> · {t('station.dirSpread', { deg: dirStab.sdDeg })}</span>
            </div>
          )}
          <WindAlerts alerts={alerts} />
          {dayTop && dayTop.windKn !== null && (
            <div className="mt-1 text-xs text-muted-foreground">
              {t('station.maxToday')}{' '}
              <span className="font-mono font-semibold text-foreground">{show(dayTop.windKn)} {unitLabel}</span>
              {dayTop.windAt && <> {t('station.at', { time: clock(dayTop.windAt) })}</>}
              {dayTop.gustKn !== null && (
                <>
                  {' · '}{t('station.gust').toLowerCase()}{' '}
                  <span className="font-mono font-semibold text-foreground">{show(dayTop.gustKn)} {unitLabel}</span>
                  {dayTop.gustAt && <> {t('station.at', { time: clock(dayTop.gustAt) })}</>}
                </>
              )}
            </div>
          )}
          {!online && (
            <div className="mt-1 text-[0.65rem] text-muted-foreground">
              {t('station.lastSeen', { ago: agoLabel(ageMin) })}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.72rem] text-muted-foreground">
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
                  <span className={pressureDrop ? 'font-semibold text-amber-500' : ''}>
                    {' '}{pressureDelta > 0 ? '↑' : pressureDelta < 0 ? '↓' : '→'} {Math.abs(pressureDelta).toFixed(1)}/3 h
                    {pressureDrop && <> · {t('station.pressureDrop')}</>}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {history.length > 1 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('station.chartTitle')}</div>
          <StationWindChart history={history} forecast={forecast} />
        </div>
      )}
    </section>
  );
});
