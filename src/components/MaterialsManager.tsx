import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import MaterialPhoto from './MaterialPhoto';

export interface Sport {
  id: string;
  name: string;
  sort_order: number;
}
export interface MaterialCategory {
  id: string;
  slot: number;
  name: string;
  sport_id: string | null;
}
export interface MaterialItem {
  id: string;
  category_id: string;
  name: string;
  photo_url?: string | null;
}

async function removeItemPhoto(it: MaterialItem) {
  if (!it.photo_url) return;
  const marker = '/material-photos/';
  const idx = it.photo_url.indexOf(marker);
  if (idx !== -1) {
    await supabase.storage.from('material-photos').remove([it.photo_url.slice(idx + marker.length)]);
  }
}

export default function MaterialsManager() {
  const { user } = useAuth();
  const [cats, setCats] = useState<MaterialCategory[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [newItem, setNewItem] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, i, s] = await Promise.all([
      supabase.from('material_categories').select('*').order('slot'),
      supabase.from('material_items').select('*').order('name'),
      supabase.from('sports').select('*').order('sort_order').order('name'),
    ]);
    setLoading(false);
    if (c.error || i.error || s.error) { toast.error((c.error || i.error || s.error)!.message); return; }
    setCats((c.data as MaterialCategory[]) || []);
    setItems((i.data as MaterialItem[]) || []);
    setSports((s.data as Sport[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addSlot = async () => {
    if (!user) return;
    const nextSlot = cats.length ? Math.max(...cats.map(c => c.slot)) + 1 : 1;
    const { data, error } = await supabase.from('material_categories')
      .insert({ user_id: user.id, slot: nextSlot, name: 'Nuevo slot' })
      .select().single();
    if (error) { toast.error(error.message); return; }
    const created = data as MaterialCategory;
    setCats(cs => [...cs, created].sort((a, b) => a.slot - b.slot));
    setEditingSlot(created.slot);
    setEditName(created.name);
  };

  const deleteSlot = async (cat: MaterialCategory) => {
    if (!confirm(`¿Eliminar el slot "${cat.name}" y todos sus materiales?`)) return;
    const catItems = items.filter(i => i.category_id === cat.id);
    await Promise.all(catItems.map(removeItemPhoto));
    const { error } = await supabase.from('material_categories').delete().eq('id', cat.id);
    if (error) { toast.error(error.message); return; }
    setCats(cs => cs.filter(c => c.id !== cat.id));
    setItems(is => is.filter(i => i.category_id !== cat.id));
    toast.success('Slot eliminado');
  };

  const saveName = async (cat: MaterialCategory) => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('Pon un nombre'); return; }
    const { error } = await supabase.from('material_categories')
      .update({ name: trimmed.slice(0, 40) }).eq('id', cat.id);
    if (error) { toast.error(error.message); return; }
    setCats(cs => cs.map(c => c.id === cat.id ? { ...c, name: trimmed.slice(0, 40) } : c));
    setEditingSlot(null);
    toast.success('Categoría guardada');
  };

  const updateSlotSport = async (cat: MaterialCategory, sportId: string) => {
    const value = sportId || null;
    const { error } = await supabase.from('material_categories')
      .update({ sport_id: value }).eq('id', cat.id);
    if (error) { toast.error(error.message); return; }
    setCats(cs => cs.map(c => c.id === cat.id ? { ...c, sport_id: value } : c));
  };

  const addItem = async (cat: MaterialCategory) => {
    if (!user) return;
    const text = (newItem[cat.slot] || '').trim();
    if (!text) return;
    const { data, error } = await supabase.from('material_items')
      .insert({ user_id: user.id, category_id: cat.id, name: text.slice(0, 80) })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setItems(is => [...is, data as MaterialItem]);
    setNewItem(n => ({ ...n, [cat.slot]: '' }));
  };

  const deleteItem = async (id: string) => {
    const it = items.find(x => x.id === id);
    if (it) await removeItemPhoto(it);
    const { error } = await supabase.from('material_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.filter(x => x.id !== id));
  };

  const startEditItem = (it: MaterialItem) => {
    setEditingItemId(it.id);
    setEditItemName(it.name);
  };

  const saveItemName = async (id: string) => {
    const trimmed = editItemName.trim();
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return; }
    const { error } = await supabase.from('material_items')
      .update({ name: trimmed.slice(0, 80) }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.map(x => x.id === id ? { ...x, name: trimmed.slice(0, 80) } : x));
    setEditingItemId(null);
    toast.success('Nombre actualizado');
  };

  const updateItemPhoto = (id: string, newUrl: string | null) => {
    setItems(is => is.map(x => x.id === id ? { ...x, photo_url: newUrl } : x));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando materiales...</p>;

  return (
    <div className="space-y-4">
      {cats.map(cat => {
        const catItems = items.filter(i => i.category_id === cat.id);
        const isEditing = editingSlot === cat.slot;
        return (
          <div key={cat.id} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                Slot {cat.slot}
              </span>
              {isEditing ? (
                <div className="flex flex-1 items-center gap-1">
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} maxLength={40}
                    className="flex-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none" />
                  <button onClick={() => saveName(cat)} className="rounded bg-primary p-1 text-primary-foreground">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingSlot(null)} className="rounded border border-border p-1 text-muted-foreground">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-display text-sm font-bold">{cat.name}</span>
                  <button onClick={() => { setEditingSlot(cat.slot); setEditName(cat.name); }}
                    className="text-muted-foreground hover:text-primary">
                    <Pencil size={13} />
                  </button>
                  <select
                    value={cat.sport_id ?? ''}
                    onChange={e => updateSlotSport(cat, e.target.value)}
                    className="ml-auto rounded border border-border bg-background px-1.5 py-1 text-[0.65rem] text-muted-foreground outline-none focus:border-primary"
                    title="Deporte al que pertenece este slot"
                  >
                    <option value="">— Todos los deportes —</option>
                    {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button onClick={() => deleteSlot(cat)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>

            {catItems.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {catItems.map(it => (
                  <li key={it.id} className="group flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
                    <MaterialPhoto
                      itemId={it.id}
                      photoUrl={it.photo_url || null}
                      onUpdated={(url) => updateItemPhoto(it.id, url)}
                      size="sm"
                    />
                    {editingItemId === it.id ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          autoFocus
                          value={editItemName}
                          onChange={e => setEditItemName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveItemName(it.id); }
                            if (e.key === 'Escape') setEditingItemId(null);
                          }}
                          maxLength={80}
                          className="flex-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-xs outline-none"
                        />
                        <button onClick={() => saveItemName(it.id)} className="rounded bg-primary p-1 text-primary-foreground">
                          <Check size={12} />
                        </button>
                        <button onClick={() => setEditingItemId(null)} className="rounded border border-border p-1 text-muted-foreground">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{it.name}</span>
                        <button onClick={() => startEditItem(it)}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteItem(it.id)}
                          className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-1">
              <input value={newItem[cat.slot] || ''} onChange={e => setNewItem(n => ({ ...n, [cat.slot]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(cat); } }}
                placeholder={`Añadir ${cat.name.toLowerCase()}...`} maxLength={80}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
              <button onClick={() => addItem(cat)}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110">
                <Plus size={12} /> Añadir
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={addSlot}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
      >
        <Plus size={15} /> Añadir slot
      </button>
    </div>
  );
}
