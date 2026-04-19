import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

export interface MaterialCategory {
  id: string;
  slot: number;
  name: string;
}
export interface MaterialItem {
  id: string;
  category_id: string;
  name: string;
}

const DEFAULT_NAMES = ['Tabla', 'Vela', 'Aleta', 'Otro'];

export default function MaterialsManager() {
  const { user } = useAuth();
  const [cats, setCats] = useState<MaterialCategory[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newItem, setNewItem] = useState<Record<number, string>>({});

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

  const ensureCategory = async (slot: number, name: string): Promise<MaterialCategory | null> => {
    if (!user) return null;
    const existing = cats.find(c => c.slot === slot);
    if (existing) {
      if (existing.name === name) return existing;
      const { error } = await supabase.from('material_categories')
        .update({ name }).eq('id', existing.id);
      if (error) { toast.error(error.message); return null; }
      const updated = { ...existing, name };
      setCats(cs => cs.map(c => c.id === existing.id ? updated : c));
      return updated;
    }
    const { data, error } = await supabase.from('material_categories')
      .insert({ user_id: user.id, slot, name }).select().single();
    if (error) { toast.error(error.message); return null; }
    setCats(cs => [...cs, data as MaterialCategory].sort((a, b) => a.slot - b.slot));
    return data as MaterialCategory;
  };

  const startEdit = (slot: number) => {
    const c = cats.find(x => x.slot === slot);
    setEditName(c?.name || DEFAULT_NAMES[slot - 1]);
    setEditingSlot(slot);
  };

  const saveName = async (slot: number) => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('Pon un nombre'); return; }
    const ok = await ensureCategory(slot, trimmed.slice(0, 40));
    if (ok) { setEditingSlot(null); toast.success('Categoría guardada'); }
  };

  const addItem = async (slot: number) => {
    if (!user) return;
    const text = (newItem[slot] || '').trim();
    if (!text) return;
    let cat = cats.find(c => c.slot === slot);
    if (!cat) {
      cat = (await ensureCategory(slot, DEFAULT_NAMES[slot - 1])) || undefined;
      if (!cat) return;
    }
    const { data, error } = await supabase.from('material_items')
      .insert({ user_id: user.id, category_id: cat.id, name: text.slice(0, 80) })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setItems(is => [...is, data as MaterialItem]);
    setNewItem(n => ({ ...n, [slot]: '' }));
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('material_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.filter(x => x.id !== id));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando materiales...</p>;

  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(slot => {
        const cat = cats.find(c => c.slot === slot);
        const catItems = cat ? items.filter(i => i.category_id === cat.id) : [];
        const isEditing = editingSlot === slot;
        return (
          <div key={slot} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                Slot {slot}
              </span>
              {isEditing ? (
                <div className="flex flex-1 items-center gap-1">
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} maxLength={40}
                    className="flex-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none" />
                  <button onClick={() => saveName(slot)} className="rounded bg-primary p-1 text-primary-foreground">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingSlot(null)} className="rounded border border-border p-1 text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-display text-sm font-bold">
                    {cat?.name || <span className="text-muted-foreground italic">Sin nombre</span>}
                  </span>
                  <button onClick={() => startEdit(slot)}
                    className="ml-auto text-muted-foreground hover:text-primary">
                    <Pencil size={13} />
                  </button>
                </>
              )}
            </div>

            {cat && (
              <>
                {catItems.length > 0 && (
                  <ul className="mb-2 flex flex-wrap gap-1.5">
                    {catItems.map(it => (
                      <li key={it.id} className="group flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                        {it.name}
                        <button onClick={() => deleteItem(it.id)}
                          className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={11} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="flex gap-1">
              <input value={newItem[slot] || ''} onChange={e => setNewItem(n => ({ ...n, [slot]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(slot); } }}
                placeholder={`Añadir ${cat?.name?.toLowerCase() || 'material'}...`} maxLength={80}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
              <button onClick={() => addItem(slot)}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110">
                <Plus size={12} /> Añadir
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
