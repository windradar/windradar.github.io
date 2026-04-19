import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSelector } from '@/components/ThemeSelector';
import { WindRose } from '@/components/WindRose';
import { SearchWithSuggestions } from '@/components/SearchSuggestions';
import { WindCharts } from '@/components/WindCharts';
import { WindCompareChart } from '@/components/WindCompareChart';
import { SettingsPanel, loadSettings, type AppSettings } from '@/components/SettingsPanel';
import { UserMenu } from '@/components/UserMenu';
import { LegalFooter } from '@/components/LegalFooter';
import {
  type WeatherData, type MarineData,
  windInfo, bft, windColor, waveColor, dirArrow, kmhToKnots,
  WX_ICON, WX_DESC, safeNum, localDateStr, humanDate,
  addToSearchHistory,
} from '@/lib/weather-helpers';
import { windRowStyle } from '@/lib/wind-row-color';
import logoFlow from '@/assets/logo-flow.png';

export default function Index() {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [name, setName] = useState('WindFlowRadar');
  const [date, setDate] = useState(localDateStr(new Date()));
  const [wx, setWx] = useState<WeatherData | null>(null);
  const [mar, setMar] = useState<MarineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [apiUpdateTime, setApiUpdateTime] = useState<string | null>(null);

  const today = localDateStr(new Date());
  const minDate = localDateStr(new Date(Date.now() - 7 * 86400000));
  const maxDate = localDateStr(new Date(Date.now() + 6 * 86400000));

  const fetchWeather = useCallback(async (latitude: number, longitude: number, selectedDate?: string) => {
    setLoadingText('Descargando previsión meteorológica...');
    const targetDate = selectedDate || localDateStr(new Date());
    const isPast = targetDate < localDateStr(new Date());

    let wxUrl: string;
    let marUrl: string;

    if (isPast) {
      wxUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,weathercode,cloud_cover&wind_speed_unit=kmh&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
      marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,swell_wave_height,sea_surface_temperature&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;
    } else {
      wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,weathercode,cloud_cover&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
      marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,swell_wave_height,sea_surface_temperature&timezone=auto&forecast_days=7`;
    }

    const [wxRes, marRes] = await Promise.all([
      fetch(wxUrl).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
      fetch(marUrl).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (wxRes.error) throw new Error(wxRes.reason || 'Error en previsión');

    // Extract API generation time
    const genTime = wxRes.generationtime_ms;
    const updateStr = genTime ? `Generado en ${genTime.toFixed(0)}ms` : null;
    setApiUpdateTime(updateStr);

    setWx(wxRes);
    setMar(marRes);
    setLoading(false);
  }, []);

  const doSearch = useCallback(async (searchName: string, searchLat: number, searchLon: number) => {
    setError('');
    setLoading(true);
    try {
      setLat(searchLat);
      setLon(searchLon);
      setName(searchName);
      addToSearchHistory({ name: searchName, lat: searchLat, lon: searchLon });
      await fetchWeather(searchLat, searchLon, date);
    } catch (e: any) {
      setLoading(false);
      setError('Error: ' + e.message);
    }
  }, [fetchWeather, date]);

  // Reload data when date changes and we have coordinates
  const handleDateChange = useCallback(async (newDate: string) => {
    setDate(newDate);
    if (lat !== null && lon !== null) {
      setError('');
      setLoading(true);
      try {
        await fetchWeather(lat, lon, newDate);
      } catch (e: any) {
        setLoading(false);
        setError('Error: ' + e.message);
      }
    }
  }, [lat, lon, fetchWeather]);

  // Compute table data
  const h = wx?.hourly;
  const allDayIdxs: number[] = [];
  if (h) {
    for (let i = 0; i < h.time.length; i++) {
      if (h.time[i].slice(0, 10) === date) allDayIdxs.push(i);
    }
  }

  // Filter by settings hour range
  const dayIdxs = allDayIdxs.filter(i => {
    if (!h) return false;
    const hr = h.time[i].slice(11, 16);
    return hr >= settings.gridFromHour && hr <= settings.gridToHour;
  });

  let curRow = -1;
  if (h && date === today) {
    const nowH = new Date().getHours();
    for (let j = 0; j < dayIdxs.length; j++) {
      if (parseInt(h.time[dayIdxs[j]].slice(11, 13), 10) === nowH) { curRow = j; break; }
    }
  }
  const refI = curRow >= 0 ? dayIdxs[curRow] : (dayIdxs.length > 0 ? dayIdxs[0] : 0);

  const marVal = (key: string, i: number): number | null => {
    if (mar?.hourly && (mar.hourly as any)[key]) {
      const v = (mar.hourly as any)[key][i];
      return v !== undefined && v !== null ? v : null;
    }
    return null;
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

  return (
    <div className="relative z-[1] min-h-screen">
      {/* Spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-lg"
          >
            <div className="h-11 w-11 rounded-full border-[3px] border-border border-t-primary animate-spin" />
            <div className="text-xs tracking-widest text-muted-foreground">{loadingText}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1300px] px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-shrink-0 flex items-center gap-1.5">
              <img src={logoFlow} alt="WindFlowRadar" className="h-8 w-8 rounded-full sm:h-9 sm:w-9" />
              <span className="font-display text-base font-extrabold tracking-tight sm:text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">WindFlowRadar</span>
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <SearchWithSuggestions onSelect={doSearch} />
            </div>
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={e => handleDateChange(e.target.value)}
              className="rounded-lg border border-border bg-secondary px-2 py-2 font-mono text-xs text-foreground outline-none focus:border-primary sm:px-2.5 sm:text-[0.78rem]"
            />
            <ThemeSelector />
            <UserMenu />
          </div>
          <div className="mt-2 sm:hidden">
            <SearchWithSuggestions onSelect={doSearch} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-[1] mx-auto max-w-[1300px] px-3 py-4 sm:py-6 md:px-5">
        {/* Location bar */}
        <div className="mb-4 flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">{name}</h1>
          {lat !== null && (
            <span className="text-[0.65rem] text-muted-foreground sm:text-[0.7rem]">
              {lat.toFixed(4)}°N {Math.abs(lon!).toFixed(4)}°{lon! < 0 ? 'O' : 'E'}
            </span>
          )}
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-primary sm:px-2.5 sm:text-[0.65rem]">
            {wx ? 'EN VIVO' : 'LISTO'}
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            ⚠️ {error}
          </div>
        )}

        <SectionTitle>Condiciones actuales</SectionTitle>

        {!wx ? (
          <div className="mb-6 rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground sm:p-8">
            Introduce una ubicación y pulsa <strong className="text-primary">BUSCAR</strong> para cargar la previsión
          </div>
        ) : cardData && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4">
            <NowCard highlight label="💨 Viento" value={`${Math.round(kmhToKnots(cardData.ws))}`} unit="kn" sub={`Ráf: ${Math.round(kmhToKnots(cardData.wg))} kn · ${Math.round(cardData.ws)} km/h`} color={windColor(cardData.ws)} />
            <div className="col-span-2 sm:col-span-1 lg:row-span-2">
              <WindRose degrees={cardData.wd} speed={cardData.ws} gustSpeed={cardData.wg} />
            </div>
            <NowCard label="⚡ Beaufort" value={`${cardData.b[0]}`} unit="BFT" sub={cardData.b[1]} color={cardData.bftColor} />
            <NowCard label="🌊 Altura ola" value={cardData.wh ? cardData.wh.toFixed(1) : '—'} unit="m" sub={`Swell: ${cardData.swh !== null ? cardData.swh.toFixed(1) + ' m' : '—'}`} color={waveColor(cardData.wh)} />
            <NowCard label="🌡️ Temp. aire" value={safeNum(cardData.temp, 1)} unit="°C" />
            <NowCard label="🌊 Temp. agua" value={safeNum(cardData.sst, 1)} unit="°C" sub="Superficie mar" color="#4dd9ff" />
            <NowCard label="☁️ Tiempo" value={WX_ICON[cardData.code] || '🌡️'} sub={WX_DESC[cardData.code] || ''} isEmoji />
            <NowCard label="☔ Precipitación" value={cardData.prec.toFixed(1)} unit="mm" sub="Última hora" />
          </div>
        )}

        {/* Actions row */}
        {wx && (
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <ShareRangePanel wx={wx} mar={mar} name={name} date={date} dayIdxs={allDayIdxs} />
            <SettingsPanel settings={settings} onChange={setSettings} />
          </div>
        )}

        {/* Table */}
        <SectionTitle>Previsión horaria — {humanDate(date)}</SectionTitle>

        {/* Desktop table */}
        <div className="mb-6 hidden overflow-x-auto rounded-lg border border-border md:block">
          <table className="w-full min-w-[850px] border-collapse font-mono text-[0.88rem]">
            <thead>
              <tr className="bg-secondary">
                {['HORA','🌡️ AIRE','💧 AGUA','💨 VIENTO (kn)','⚡ RÁFAGA (kn)','🧭 DIRECCIÓN','⛵ NOMBRE','🌊 OLA','🌊 DIR.','☁️ TIEMPO','☔ PRECIP.','BFT'].map(th => (
                  <th key={th} className="whitespace-nowrap border-b border-border px-2.5 py-2.5 text-center text-[0.6rem] font-medium uppercase tracking-widest text-muted-foreground">{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!h || dayIdxs.length === 0 ? (
                <tr><td colSpan={12} className="py-7 text-center text-sm text-muted-foreground">Sin datos — introduce una ubicación y pulsa Buscar</td></tr>
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
                const isCur = ri === curRow;

                const knots = Math.round(kmhToKnots(ws));
                const rowStyle = windRowStyle(knots, settings.minWindKn);

                return (
                  <tr key={idx} style={rowStyle.backgroundColor ? { backgroundColor: rowStyle.backgroundColor } : undefined} className={`border-b border-border/40 transition-colors ${!rowStyle.backgroundColor ? 'hover:bg-primary/[0.03]' : ''} ${isCur ? 'ring-1 ring-primary' : ''}`}>
                    <td className={`py-2.5 pl-3.5 text-left ${isCur ? 'border-l-2 border-primary' : ''}`} style={rowStyle.color ? { color: rowStyle.color } : undefined}>{isCur ? '▶ ' : ''}{hour}</td>
                    <td className="text-center" style={{ color: rowStyle.color || undefined }}>{safeNum(temp, 1)}°</td>
                    <td className="text-center font-medium" style={{ color: rowStyle.color || '#0ea5e9' }}>{safeNum(sst, 1)}°</td>
                    <td className="text-center font-bold text-[0.95rem]" style={{ color: rowStyle.color || windColor(ws) }}>{knots}</td>
                    <td className="text-center font-semibold" style={{ color: rowStyle.color || windColor(wg) }}>{Math.round(kmhToKnots(wg))}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}>{dirArrow(wd)} {wi.short} <span className="text-[0.72rem]">{Math.round(wd)}°</span></td>
                    <td className="text-center" style={{ color: rowStyle.color || windColor(ws) }}>{wi.full}</td>
                    <td className="text-center font-medium" style={{ color: rowStyle.color || waveColor(wh) }}>{wh ? wh.toFixed(1) + 'm' : '—'}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}>{wdir2}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}>{WX_ICON[code] || ''} <span className="text-[0.75rem]">{WX_DESC[code] || ''}</span></td>
                    <td className="text-center" style={{ color: rowStyle.color || (prec > 0.5 ? '#4dd9ff' : undefined) }}>{prec.toFixed(1)}</td>
                    <td className="text-center" style={rowStyle.color ? { color: rowStyle.color } : undefined}><span className="font-bold">{b[0]}</span> <span className="text-[0.75rem]">{b[1]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile hourly cards */}
        <div className="mb-6 space-y-2 md:hidden">
          {!h || dayIdxs.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Sin datos</div>
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
            const isCur = ri === curRow;
            const mobileKnots = Math.round(kmhToKnots(ws));
            const mobileRowStyle = windRowStyle(mobileKnots, settings.minWindKn);

            return (
              <div key={idx} className={`rounded-lg border p-3 ${isCur ? 'border-primary/50' : 'border-border'}`} style={{ backgroundColor: mobileRowStyle.backgroundColor || undefined, color: mobileRowStyle.color || undefined }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-foreground">{isCur ? '▶ ' : ''}{hour}</span>
                  <span className="text-lg">{WX_ICON[code] || ''}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[0.82rem]">
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">💨 </span>
                    <span className="font-bold text-[0.9rem]" style={{ color: windColor(ws) }}>{Math.round(kmhToKnots(ws))} kn</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[0.7rem]">⚡ </span>
                    <span className="font-semibold text-[0.9rem]" style={{ color: windColor(wg) }}>{Math.round(kmhToKnots(wg))} kn</span>
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

        {/* Charts */}
        {wx && (
          <>
            <SectionTitle>Gráficos — próximas 48h</SectionTitle>
            <div className="mb-6 grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <WindCharts wx={wx} mar={mar} />
              {lat !== null && lon !== null && (
                <WindCompareChart lat={lat} lon={lon} />
              )}
            </div>
          </>
        )}

        <div className="pb-4 text-center text-[0.6rem] tracking-wider text-muted-foreground sm:text-[0.65rem]">
          Open-Meteo API · GFS + ECMWF · Copernicus Marine · Sin API key · Datos gratuitos
          {apiUpdateTime && <span className="ml-2">· 🕐 {apiUpdateTime}</span>}
        </div>
      </main>
      <LegalFooter />
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

function NowCard({ label, value, unit, sub, color, highlight, isEmoji }: {
  label: string; value: string; unit?: string; sub?: string; color?: string; highlight?: boolean; isEmoji?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-lg border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className={`absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent ${highlight ? 'opacity-100' : 'opacity-30'}`} />
      <div className="mb-1 text-[0.6rem] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display font-bold leading-none ${isEmoji ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`} style={color ? { color } : undefined}>
        {value}{unit && <span className="text-[0.65rem] font-normal text-muted-foreground sm:text-xs"> {unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[0.58rem] text-muted-foreground sm:text-[0.62rem]">{sub}</div>}
    </motion.div>
  );
}

function ActionBtn({ onClick, emoji, children }: { onClick: () => void; emoji: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-border bg-transparent px-3 py-2 font-display text-[0.72rem] font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary sm:px-4 sm:text-[0.78rem]">
      {emoji} {children}
    </button>
  );
}

function ShareRangePanel({ wx, mar, name, date, dayIdxs }: { wx: WeatherData; mar: MarineData | null; name: string; date: string; dayIdxs: number[] }) {
  const h = wx.hourly;
  const hours = dayIdxs.map(i => h.time[i].slice(11, 16));
  const [fromH, setFromH] = useState(hours[0] || '00:00');
  const [toH, setToH] = useState(hours[hours.length - 1] || '23:00');

  const share = () => {
    const idxs = dayIdxs.filter(i => {
      const hr = h.time[i].slice(11, 16);
      return hr >= fromH && hr <= toH;
    });
    if (!idxs.length) return;

    let msg = `🌬️ *WindFlowRadar – ${name}*\n📅 ${humanDate(date)} (${fromH}–${toH})\n\n`;
    for (const idx of idxs) {
      const ws = Math.round(h.wind_speed_10m[idx] || 0);
      const wg = Math.round(h.wind_gusts_10m[idx] || 0);
      const wd = h.wind_direction_10m[idx] || 0;
      const wi = windInfo(wd);
      const wh = mar?.hourly?.wave_height?.[idx] ?? null;
      const hr = h.time[idx].slice(11, 16);
      msg += `⏰ *${hr}* — 💨 ${Math.round(kmhToKnots(ws))}kn ⚡ráf.${Math.round(kmhToKnots(wg))}kn 🧭${wi.short} 🌊${wh !== null ? wh.toFixed(1) + 'm' : '—'}\n`;
    }
    msg += `\n_WindFlowRadar · Open-Meteo_`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">Desde</label>
        <select value={fromH} onChange={e => setFromH(e.target.value)} className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
          {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">Hasta</label>
        <select value={toH} onChange={e => setToH(e.target.value)} className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
          {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
        </select>
      </div>
      <ActionBtn onClick={share} emoji="📲">Compartir</ActionBtn>
      <ActionBtn onClick={() => window.print()} emoji="🖨️">Imprimir</ActionBtn>
    </>
  );
}
