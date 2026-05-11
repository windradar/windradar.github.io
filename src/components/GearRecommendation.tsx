import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { recommendGear, type SportType, type CategoryWithItems, type SportRecommendation } from '@/lib/gear-recommend';
import type { MaterialCategory, MaterialItem } from '@/components/MaterialsManager';

interface Props {
  windKn: number;
}

export function GearRecommendation({ windKn }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [recs, setRecs] = useState<SportRecommendation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) { setReady(true); return; }

    const fetch = async () => {
      const [{ data: sports }, { data: cats }, { data: items }] = await Promise.all([
        supabase.from('sport_types').select('*').order('created_at'),
        supabase.from('material_categories').select('*').order('slot'),
        supabase.from('material_items').select('*').order('name'),
      ]);

      const sportList = (sports || []) as SportType[];
      const catList   = (cats   || []) as MaterialCategory[];
      const itemList  = (items  || []) as MaterialItem[];

      const categories: CategoryWithItems[] = catList.map(c => ({
        ...c,
        items: itemList.filter(i => i.category_id === c.id),
      }));

      setRecs(recommendGear(windKn, sportList, categories));
      setReady(true);
    };

    fetch();
  }, [user, windKn]);

  if (!ready || !user || recs.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[0.62rem] font-bold uppercase tracking-widest text-primary">
          🎿 {t('gear.title')}
        </span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.6rem] font-mono text-primary">
          {windKn} kn
        </span>
      </div>

      {/* One block per sport */}
      <div className="space-y-4">
        {recs.map(rec => (
          <div key={rec.sport.id}>
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              {rec.sport.name}
            </p>
            <div className="flex flex-wrap gap-3">
              {rec.items.map(ri => (
                <div key={ri.item.id} className="flex flex-col items-center gap-1" style={{ minWidth: 64 }}>
                  {/* Photo or placeholder */}
                  {ri.item.photo_url ? (
                    <img
                      src={ri.item.photo_url}
                      alt={ri.item.name}
                      className="h-16 w-16 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-secondary text-xl">
                      🏄
                    </div>
                  )}

                  {/* Item name */}
                  <span className="max-w-[72px] text-center text-[0.6rem] font-medium leading-tight text-foreground">
                    {ri.item.name}
                  </span>

                  {/* Wind range badge */}
                  {ri.hasRange && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-medium ${
                      ri.inRange
                        ? 'bg-green-500/15 text-green-500'
                        : ri.nearRange
                        ? 'bg-orange-400/15 text-orange-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {ri.item.wind_min_kn}–{ri.item.wind_max_kn} kn
                      {!ri.inRange && ri.nearRange && ` ⚠`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-border/50 pt-2 text-[0.58rem] text-muted-foreground">
        {t('gear.basedOn')}
        <Link to="/materials" className="ml-1 text-primary hover:underline">
          {t('gear.manage')}
        </Link>
      </div>
    </div>
  );
}
