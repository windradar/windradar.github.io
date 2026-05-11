import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MaterialsManager from '@/components/MaterialsManager';
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

        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs text-muted-foreground">{t('materials.description')}</p>
          <MaterialsManager />
        </section>
      </div>
    </div>
  );
}
