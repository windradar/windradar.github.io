import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  availableYears, filterSessions, computeStats, buildChartBuckets,
  MONTH_LABELS_ES, type Session, type PeriodMode, type PeriodFilter,
} from '@/lib/session-stats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const PERIOD_MODES: PeriodMode[] = ['year', 'month', 'range', 'all'];

const chartOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#4a6a8a', font: { size: 9 }, maxTicksLimit: 16 }, grid: { display: false } },
    y: { ticks: { color: '#4a6a8a', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(26,46,72,.4)' } },
  },
};

function StatTile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 truncate text-[0.58rem] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="truncate font-display text-lg font-bold leading-none">
        {value}
        {unit && <span className="ml-0.5 text-[0.6rem] font-normal text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-1 truncate text-[0.6rem] text-muted-foreground">{sub}</div>}
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label={t('sessions.statSessions')} value={String(stats.count)} />
        <StatTile label={t('sessions.statHours')} value={stats.totalHours.toFixed(1)} unit="h" />
        <StatTile label={t('sessions.statAvgWind')} value={stats.avgWindKn !== null ? String(Math.round(stats.avgWindKn)) : '—'} unit="kn" />
        <StatTile label={t('sessions.statMaxGust')} value={stats.maxGustKn !== null ? String(Math.round(stats.maxGustKn)) : '—'} unit="kn" />
        <StatTile
          label={t('sessions.statTopSpot')}
          value={stats.topLocation?.name ?? '—'}
          sub={stats.topLocation ? `${stats.topLocation.count}×` : undefined}
        />
        <StatTile
          label={t('sessions.statTopMaterial')}
          value={stats.topMaterial?.name ?? '—'}
          sub={stats.topMaterial ? `${stats.topMaterial.count}×` : undefined}
        />
      </div>

      {stats.count > 0 ? (
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <Bar
            key={`${mode}-${buckets.length}`}
            data={{
              labels: buckets.map(b => b.label),
              datasets: [{ label: t('sessions.chartTitle'), data: buckets.map(b => b.count), backgroundColor: '#00d4ff99', borderColor: '#00d4ff', borderWidth: 1 }],
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
