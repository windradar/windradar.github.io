import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MaterialsManager from '@/components/MaterialsManager';
import SportsManager from '@/components/SportsManager';
import { useTranslation } from 'react-i18next';

export default function Materials() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> {t('common.back')}
        </Link>

        <h1 className="mb-6 font-display text-2xl font-extrabold">🛠️ {t('materials.title')}</h1>

        <section className="mb-5 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-wider">🏄 Deportes</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Crea tus disciplinas y asocia cada slot de material a una de ellas para poder desglosar tus sesiones por deporte.
          </p>
          <SportsManager />
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs text-muted-foreground">{t('materials.description')}</p>
          <MaterialsManager />
        </section>
      </div>
    </div>
  );
}
