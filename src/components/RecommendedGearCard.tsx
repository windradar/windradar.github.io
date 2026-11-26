import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LANG_LOCALE } from '@/lib/weather-helpers';
import { recommendGear, DEFAULT_WEIGHT_KG, type GearItem, type GearKind } from '@/lib/gear-recommendation';

interface GearData {
  items: GearItem[];
  weightKg: number | null;
}

export function RecommendedGearCard({ windKmh, gustKmh }: { windKmh: number; gustKmh: number | null }) {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [gear, setGear] = useState<GearData | null>(null);

  useEffect(() => {
    if (!user) { setGear(null); return; }
    let cancelled = false;
    Promise.all([
      supabase.from('material_items').select('id, name, kind, size').not('kind', 'is', null).not('size', 'is', null),
      supabase.from('profiles').select('weight_kg').eq('user_id', user.id).maybeSingle(),
    ]).then(([itemsRes, profileRes]) => {
      if (cancelled) return;
      const items = (itemsRes.data ?? []).map(r => ({
        id: r.id, name: r.name, kind: r.kind as GearKind, size: Number(r.size),
      }));
      const weight = Number(profileRes.data?.weight_kg);
      setGear({ items, weightKg: weight > 0 ? weight : null });
    });
    return () => { cancelled = true; };
  }, [user]);

  const rec = useMemo(
    () => (gear?.items.length ? recommendGear(gear.items, windKmh, gustKmh, gear.weightKg ?? DEFAULT_WEIGHT_KG) : null),
    [gear, windKmh, gustKmh],
  );

  const num = (v: number) => v.toLocaleString(LANG_LOCALE[i18n.language] || 'es-ES', { maximumFractionDigits: 1 });
  const linkClass = 'font-semibold text-primary underline-offset-2 hover:underline';

  let body: React.ReactNode;
  if (authLoading || (user && !gear)) {
    body = <div className="font-display text-xl font-bold leading-none text-muted-foreground">—</div>;
  } else if (!user) {
    body = <Link to="/auth" className={`text-[0.78rem] ${linkClass}`}>{t('index.gear.signIn')}</Link>;
  } else if (!rec) {
    body = (
      <>
        <Link to="/materials" className={`text-[0.78rem] ${linkClass}`}>{t('index.gear.addGear')}</Link>
        <div className="mt-1 text-[0.62rem] text-muted-foreground">{t('index.gear.addGearHint')}</div>
      </>
    );
  } else {
    const rows = [
      { label: t('index.gear.sail'), item: rec.sail, unit: 'm²' },
      { label: t('index.gear.board'), item: rec.board, unit: 'L' },
    ].filter(r => r.item);
    const warnings = rec.warnings.map(w =>
      w === 'gusty' && rec.altSail
        ? t('index.gear.gustyAlt', { name: rec.altSail.name, size: num(rec.altSail.size) })
        : t(`index.gear.${w}`));
    body = (
      <>
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.label} className="flex items-baseline gap-1.5">
              <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground/60">{r.label}</span>
              <span className="min-w-0 truncate font-display text-base font-bold leading-tight">{r.item!.name}</span>
              <span className="ml-auto whitespace-nowrap text-[0.8rem] font-semibold text-foreground/80">{num(r.item!.size)} {r.unit}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[0.72rem] text-muted-foreground">
          {rec.idealSailM2 !== null
            ? t('index.gear.summary', { kn: rec.windKn, ideal: num(rec.idealSailM2) })
            : `${rec.windKn} kn`}
        </div>
        {warnings.map(w => (
          <div key={w} className="mt-0.5 text-[0.72rem] font-medium text-amber-500">{w}</div>
        ))}
        {gear?.weightKg == null && (
          <Link to="/profile" className="mt-0.5 block text-[0.62rem] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
            {t('index.gear.addWeight')}
          </Link>
        )}
        <div className="mt-1 text-[0.58rem] text-muted-foreground/60">{t('index.gear.disclaimer')}</div>
      </>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-lg border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-30" />
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{t('index.gear.title')}</div>
      {body}
    </m.div>
  );
}
