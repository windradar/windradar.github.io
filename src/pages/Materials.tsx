import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MaterialsManager from '@/components/MaterialsManager';

export default function Materials() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> Volver
        </Link>

        <h1 className="mb-6 font-display text-2xl font-extrabold">🛠️ Materiales</h1>

        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs text-muted-foreground">
            Personaliza el nombre de cada slot (Velas, Tablas...) y añade tus materiales. Aparecerán como desplegable al registrar una sesión.
          </p>
          <MaterialsManager />
        </section>
      </div>
    </div>
  );
}
