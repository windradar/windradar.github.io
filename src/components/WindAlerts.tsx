import { useTranslation } from 'react-i18next';
import { AlertTriangle, Waves } from 'lucide-react';
import { WIND_UNIT_LABEL, formatWind, useWindUnit, windFromKnots } from '@/lib/wind-units';
import type { AlertTone, WindAlert } from '@/lib/station-alerts';

const TONE_CLASS: Record<AlertTone, string> = {
  danger: 'border-destructive/60 bg-destructive/15 text-destructive',
  warn: 'border-amber-500/50 bg-amber-500/10 text-amber-500',
  info: 'border-primary/40 bg-primary/10 text-primary',
};

/** Chips with the wind notices (offshore, gusty, sea breeze); renders nothing when there are none */
export function WindAlerts({ alerts, big = false }: { alerts: WindAlert[]; big?: boolean }) {
  const { t } = useTranslation();
  const unit = useWindUnit();
  if (!alerts.length) return null;

  return (
    <div className={`flex flex-col gap-1.5 ${big ? 'mt-3' : 'mt-2'}`} role="status">
      {alerts.map(a => (
        <div
          key={a.kind}
          className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 font-semibold ${TONE_CLASS[a.tone]} ${big ? 'text-[min(3.4vw,3.4vh)]' : 'text-xs'}`}
        >
          {a.kind === 'thermal'
            ? <Waves className={`mt-0.5 shrink-0 ${big ? 'h-[1em] w-[1em]' : 'h-3.5 w-3.5'}`} />
            : <AlertTriangle className={`mt-0.5 shrink-0 ${big ? 'h-[1em] w-[1em]' : 'h-3.5 w-3.5'}`} />}
          <span>
            {t(`station.alert_${a.kind}`, {
              diff: a.diffKn === undefined ? '' : formatWind(windFromKnots(a.diffKn, unit), unit),
              unit: WIND_UNIT_LABEL[unit],
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
