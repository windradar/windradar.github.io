import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import type { MaterialCategory, MaterialItem } from './MaterialsManager';

interface Props {
  sportId: string | null;
  values: Record<string, string>; // category_id -> item name (or '')
  onChange: (categoryId: string, value: string) => void;
}

export default function MaterialSelect({ sportId, values, onChange }: Props) {
  const { user } = useAuth();
  const [cats, setCats] = useState<MaterialCategory[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogCatId, setDialogCatId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, i] = await Promise.all([
      supabase.from('material_categories').select('*').order('slot'),
      supabase.from('material_items').select('*').order('name'),
    ]);
    setLoading(false);
    if (c.error || i.error) { toast.error((c.error || i.error)!.message); return; }
    setCats((c.data as MaterialCategory[]) || []);
    setItems((i.data as MaterialItem[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const visibleCats = cats.filter(c => c.sport_id === sportId || c.sport_id === null);

  const addItemQuick = async () => {
    if (!user || dialogCatId === null) return;
    const text = newItemName.trim();
    if (!text) { toast.error('Pon un nombre'); return; }

    setSavingNew(true);
    const { data: item, error } = await supabase.from('material_items')
      .insert({ user_id: user.id, category_id: dialogCatId, name: text.slice(0, 80) })
      .select().single();
    setSavingNew(false);
    if (error) { toast.error(error.message); return; }
    setItems(is => [...is, item as MaterialItem]);
    onChange(dialogCatId, (item as MaterialItem).name);
    toast.success('Material añadido');
    setNewItemName('');
    setDialogCatId(null);
  };

  if (loading) return <p className="text-xs text-muted-foreground">Cargando materiales...</p>;

  if (visibleCats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay slots de material configurados{sportId ? ' para este deporte' : ''}. Configúralos en Materiales.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleCats.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          const selectedItem = catItems.find(it => it.name === values[cat.id]);
          return (
            <div key={cat.id}>
              <label className="mb-1 flex items-center gap-2">
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                  {cat.name}
                </span>
              </label>
              <div className="flex items-stretch gap-1">
                {selectedItem?.photo_url && (
                  <img
                    src={selectedItem.photo_url}
                    alt={selectedItem.name}
                    className="h-auto w-10 rounded-md border border-border object-cover"
                    loading="lazy"
                  />
                )}
                <select value={values[cat.id] || ''} onChange={e => onChange(cat.id, e.target.value)}
                  className="flex-1 rounded-md border border-border bg-secondary px-2 py-2 text-sm outline-none focus:border-primary">
                  <option value="">— ninguno —</option>
                  {catItems.map(it => (
                    <option key={it.id} value={it.name}>
                      {it.photo_url ? '🖼️ ' : ''}{it.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => { setDialogCatId(cat.id); setNewItemName(''); }}
                  title="Añadir nuevo material a esta categoría"
                  className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 text-xs font-bold text-primary hover:bg-primary/20">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {dialogCatId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
             onClick={() => setDialogCatId(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">
                Nuevo {cats.find(c => c.id === dialogCatId)?.name}
              </h3>
              <button onClick={() => setDialogCatId(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItemQuick(); } }}
              placeholder="Ej: Gastra 4.5" maxLength={80}
              className="mb-3 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialogCatId(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                Cancelar
              </button>
              <button onClick={addItemQuick} disabled={savingNew || !newItemName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {savingNew ? '...' : 'Añadir y seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
