import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import type { MaterialCategory, MaterialItem } from './MaterialsManager';

interface Props {
  values: Record<number, string>; // slot -> item name (or '')
  onChange: (slot: number, value: string) => void;
}

const DEFAULT_NAMES = ['Material 1', 'Material 2', 'Material 3', 'Material 4'];

export default function MaterialSelect({ values, onChange }: Props) {
  const { user } = useAuth();
  const [cats, setCats] = useState<MaterialCategory[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogSlot, setDialogSlot] = useState<number | null>(null);
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

  const addItemQuick = async () => {
    if (!user || dialogSlot === null) return;
    const text = newItemName.trim();
    if (!text) { toast.error('Pon un nombre'); return; }

    let cat = cats.find(c => c.slot === dialogSlot);
    if (!cat) {
      const { data, error } = await supabase.from('material_categories')
        .insert({ user_id: user.id, slot: dialogSlot, name: DEFAULT_NAMES[dialogSlot - 1] })
        .select().single();
      if (error) { toast.error(error.message); return; }
      cat = data as MaterialCategory;
      setCats(cs => [...cs, cat!].sort((a, b) => a.slot - b.slot));
    }

    setSavingNew(true);
    const { data: item, error } = await supabase.from('material_items')
      .insert({ user_id: user.id, category_id: cat.id, name: text.slice(0, 80) })
      .select().single();
    setSavingNew(false);
    if (error) { toast.error(error.message); return; }
    setItems(is => [...is, item as MaterialItem]);
    onChange(dialogSlot, (item as MaterialItem).name);
    toast.success('Material añadido');
    setNewItemName('');
    setDialogSlot(null);
  };

  if (loading) return <p className="text-xs text-muted-foreground">Cargando materiales...</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map(slot => {
          const cat = cats.find(c => c.slot === slot);
          const catItems = cat ? items.filter(i => i.category_id === cat.id) : [];
          const label = cat?.name || DEFAULT_NAMES[slot - 1];
          return (
            <div key={slot}>
              <label className="mb-1 flex items-center gap-2">
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                  {label}
                </span>
              </label>
              <div className="flex gap-1">
                <select value={values[slot] || ''} onChange={e => onChange(slot, e.target.value)}
                  className="flex-1 rounded-md border border-border bg-secondary px-2 py-2 text-sm outline-none focus:border-primary">
                  <option value="">— ninguno —</option>
                  {catItems.map(it => (
                    <option key={it.id} value={it.name}>{it.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => { setDialogSlot(slot); setNewItemName(''); }}
                  title="Añadir nuevo material a esta categoría"
                  className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 text-xs font-bold text-primary hover:bg-primary/20">
                  <Plus size={14} />
                </button>
              </div>
              {!cat && (
                <p className="mt-1 text-[0.65rem] text-muted-foreground">
                  Sin categoría. Configúrala en Perfil → Materiales.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {dialogSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
             onClick={() => setDialogSlot(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">
                Nuevo {cats.find(c => c.slot === dialogSlot)?.name || DEFAULT_NAMES[dialogSlot - 1]}
              </h3>
              <button onClick={() => setDialogSlot(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItemQuick(); } }}
              placeholder="Ej: Gastra 4.5" maxLength={80}
              className="mb-3 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialogSlot(null)}
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
