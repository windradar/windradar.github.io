import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  availableYears, filterSessions, computeStats, buildChartBuckets, sportColor, NO_SPORT_LABEL,
  MONTH_LABELS_ES, type Session, type PeriodMode, type PeriodFilter, type BreakdownRow,
} from '@/lib/session-stats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PERIOD_MODES: PeriodMode[] = ['year', 'month', 'range', 'all'];

const chartOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#4a6a8a', font: { family: 'JetBrains Mono', size: 9 }, boxWidth: 10, padding: 8 } },
  },
  scales: {
    x: { stacked: true, ticks: { color: '#4a6a8a', font: { size: 9 }, maxTicksLimit: 16 }, grid: { display: false } },
    y: { stacked: true, ticks: { color: '#4a6a8a', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(26,46,72,.4)' } },
  },
};

function sortSportLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    if (a === NO_SPORT_LABEL) return 1;
    if (b === NO_SPORT_LABEL) return -1;
    return a.localeCompare(b);
  });
}

function BreakdownTile({ label, rows, unit, format, emptyLabel }: {
  label: string; rows: BreakdownRow[]; unit: string; format: (v: number) => string; emptyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 truncate text-[0.58rem] uppercase tracking-widest text-muted-foreground">{label}</div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">{emptyLabel}</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-foreground/85">{r.label}</span>
              <span className="shrink-0 font-mono font-bold text-foreground">
                {format(r.value)}{unit && <span className="ml-0.5 font-normal text-muted-foreground">{unit}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionsDashboard({ sessions, onFilteredChange }: {
  sessions: Session[];
  onFilteredChange: (filtered: Session[]) => void;
}) {
  const { t } = useTranslation();
  const now = new Date();
  const [mode, setMode] = useState<PeriodMode>('year');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const years = useMemo(() => availableYears(sessions, now.getFullYear()), [sessions]);
  const filter: PeriodFilter = { mode, year, month, rangeFrom, rangeTo };

  const filtered = useMemo(() => filterSessions(sessions, filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, mode, year, month, rangeFrom, rangeTo]);

  useEffect(() => { onFilteredChange(filtered); }, [filtered, onFilteredChange]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const buckets = useMemo(() => buildChartBuckets(filtered, filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, mode, year, month, rangeFrom, rangeTo]);

  const chartSportLabels = useMemo(() => {
    const set = new Set<string>();
    for (const b of buckets) for (const label of Object.keys(b.bySport)) set.add(label);
    return sortSportLabels([...set]);
  }, [buckets]);

  const selectCls = 'rounded-md border border-border bg-secondary px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary';

  return (
    <section className="mb-6 rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t('sessions.dashboardTitle')}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {t(`sessions.period${m.charAt(0).toUpperCase()}${m.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'all' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(mode === 'year' || mode === 'month') && (
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={selectCls}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {mode === 'month' && (
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={selectCls}>
              {MONTH_LABELS_ES.map((lbl, i) => <option key={lbl} value={i}>{lbl}</option>)}
            </select>
          )}
          {mode === 'range' && (
            <>
              <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className={selectCls} />
              <span className="text-xs text-muted-foreground">–</span>
              <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className={selectCls} />
            </>
          )}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <BreakdownTile
          label={t('sessions.statSessionsBySport')}
          rows={stats.sessionsBySport}
          unit=""
          format={v => String(v)}
          emptyLabel={t('sessions.noDataInPeriod')}
        />
        <BreakdownTile
          label={t('sessions.statHours')}
          rows={stats.hoursBySport}
          unit="h"
          format={v => v.toFixed(1)}
          emptyLabel={t('sessions.noDataInPeriod')}
        />
        <BreakdownTile
          label={t('sessions.statHoursByMaterial')}
          rows={stats.hoursByMaterial}
          unit="h"
          format={v => v.toFixed(1)}
          emptyLabel={t('sessions.noDataInPeriod')}
        />
      </div>

      {stats.count > 0 ? (
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <Bar
            key={`${mode}-${buckets.length}-${chartSportLabels.length}`}
            data={{
              labels: buckets.map(b => b.label),
              datasets: chartSportLabels.map(label => ({
                label,
                data: buckets.map(b => b.bySport[label] || 0),
                backgroundColor: sportColor(label),
              })),
            }}
            options={chartOpts}
            height={90}
          />
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">{t('sessions.noDataInPeriod')}</p>
      )}
    </section>
  );
}
