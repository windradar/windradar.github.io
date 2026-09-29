import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X, Wrench } from 'lucide-react';
import MaterialPhoto from './MaterialPhoto';
import { localDateStr } from '@/lib/weather-helpers';
import type { SessionMaterial } from '@/lib/session-stats';
import type { Json } from '@/integrations/supabase/types';

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
  service_interval_h?: number | null;
  last_service_at?: string | null;
}

interface UsageSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  materials: SessionMaterial[];
}

// Sessions store the material by slot + name, not by id
const usageKey = (categoryId: string, name: string) => `${categoryId}::${name.trim().toLowerCase()}`;

function sessionHours(s: UsageSession): number {
  const [sh, sm] = s.start_time.split(':').map(Number);
  const [eh, em] = s.end_time.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 0;
}

const fmtHours = (h: number) => (h < 10 && h % 1 ? h.toFixed(1).replace('.', ',') : String(Math.round(h)));

function ItemUsage({ item, total, since, onServiced }: {
  item: MaterialItem; total: number; since: number; onServiced: () => void;
}) {
  const interval = item.service_interval_h ?? null;
  const due = interval !== null && since >= interval;
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate font-medium">{item.name}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] text-muted-foreground">
        <span>{total > 0 ? `${fmtHours(total)} h de uso` : 'Sin uso registrado'}</span>
        {interval !== null && (
          <span className={due ? 'font-bold text-amber-500' : ''}>
            <Wrench size={10} className="mr-0.5 inline -translate-y-px" />
            {fmtHours(since)}/{interval} h{item.last_service_at ? ' desde la revisión' : ''}
          </span>
        )}
        {interval !== null && (
          <button
            onClick={onServiced}
            className={due
              ? 'rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 font-semibold text-amber-600 hover:bg-amber-500/20'
              : 'rounded px-1.5 py-1 text-primary underline hover:text-primary/80'}
          >
            {due ? 'Revisión pendiente · Revisado hoy' : 'Revisado hoy'}
          </button>
        )}
      </div>
    </div>
  );
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
  const [editItemInterval, setEditItemInterval] = useState('');
  const [sessions, setSessions] = useState<UsageSession[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, i, s, ss] = await Promise.all([
      supabase.from('material_categories').select('*').order('slot'),
      supabase.from('material_items').select('*').order('name'),
      supabase.from('sports').select('*').order('sort_order').order('name'),
      supabase.from('training_sessions').select('id, session_date, start_time, end_time, materials'),
    ]);
    setLoading(false);
    if (c.error || i.error || s.error) { toast.error((c.error || i.error || s.error)!.message); return; }
    setCats((c.data as MaterialCategory[]) || []);
    setItems((i.data as MaterialItem[]) || []);
    setSports((s.data as Sport[]) || []);
    // Usage is extra information: the manager still works if sessions fail to load
    if (!ss.error) setSessions((ss.data as unknown as UsageSession[]) || []);
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

  const usage = useMemo(() => {
    const map = new Map<string, { date: string; hours: number }[]>();
    for (const s of sessions) {
      const hours = sessionHours(s);
      for (const mat of s.materials ?? []) {
        if (!mat?.name?.trim()) continue;
        const k = usageKey(mat.category_id, mat.name);
        map.set(k, [...(map.get(k) ?? []), { date: s.session_date, hours }]);
      }
    }
    return map;
  }, [sessions]);

  const usageOf = (it: MaterialItem) => {
    const list = usage.get(usageKey(it.category_id, it.name)) ?? [];
    const total = list.reduce((a, u) => a + u.hours, 0);
    const since = it.last_service_at
      ? list.filter(u => u.date > it.last_service_at!).reduce((a, u) => a + u.hours, 0)
      : total;
    return { total, since };
  };

  const startEditItem = (it: MaterialItem) => {
    setEditingItemId(it.id);
    setEditItemName(it.name);
    setEditItemInterval(it.service_interval_h ? String(it.service_interval_h) : '');
  };

  const saveItem = async (id: string) => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    const name = editItemName.trim().slice(0, 80);
    if (!name) { toast.error('El nombre no puede estar vacío'); return; }
    const intervalNum = Math.round(Number(editItemInterval));
    const interval = editItemInterval.trim() && intervalNum >= 1 && intervalNum <= 10000 ? intervalNum : null;
    const { error } = await supabase.from('material_items')
      .update({ name, service_interval_h: interval }).eq('id', id);
    if (error) { toast.error(error.message); return; }

    // Keep the usage history: past sessions reference the material by name
    if (name !== it.name) {
      const oldKey = usageKey(it.category_id, it.name);
      const affected = sessions.filter(s => s.materials?.some(m => usageKey(m.category_id, m.name) === oldKey));
      const updated = affected.map(s => ({
        ...s,
        materials: s.materials.map(m => usageKey(m.category_id, m.name) === oldKey ? { ...m, name } : m),
      }));
      const results = await Promise.all(updated.map(s =>
        supabase.from('training_sessions').update({ materials: s.materials as unknown as Json }).eq('id', s.id)));
      if (results.some(r => r.error)) toast.error('No se pudo renombrar el material en alguna sesión');
      const byId = new Map(updated.map(s => [s.id, s]));
      setSessions(ss => ss.map(s => byId.get(s.id) ?? s));
    }

    setItems(is => is.map(x => x.id === id ? { ...x, name, service_interval_h: interval } : x));
    setEditingItemId(null);
    toast.success('Material actualizado');
  };

  const markServiced = async (it: MaterialItem) => {
    const today = localDateStr(new Date());
    const { error } = await supabase.from('material_items').update({ last_service_at: today }).eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.map(x => x.id === it.id ? { ...x, last_service_at: today } : x));
    toast.success(`Revisión de «${it.name}» anotada`);
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
                      <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        <input
                          autoFocus
                          value={editItemName}
                          onChange={e => setEditItemName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveItem(it.id); }
                            if (e.key === 'Escape') setEditingItemId(null);
                          }}
                          maxLength={80}
                          aria-label="Nombre del material"
                          className="min-w-[8rem] flex-1 rounded border border-primary/40 bg-background px-2 py-1.5 text-xs outline-none"
                        />
                        <label className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                          Revisar cada
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={10000}
                            value={editItemInterval}
                            onChange={e => setEditItemInterval(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveItem(it.id); } }}
                            placeholder="—"
                            className="w-16 rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                          />
                          h
                        </label>
                        <button onClick={() => saveItem(it.id)} aria-label="Guardar" className="rounded bg-primary p-2 text-primary-foreground">
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditingItemId(null)} aria-label="Cancelar" className="rounded border border-border p-2 text-muted-foreground">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ItemUsage item={it} {...usageOf(it)} onServiced={() => markServiced(it)} />
                        <button onClick={() => startEditItem(it)} aria-label={`Editar ${it.name}`}
                          className="rounded p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-primary [@media(hover:none)]:opacity-100">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteItem(it.id)} aria-label={`Eliminar ${it.name}`}
                          className="rounded p-1.5 text-muted-foreground hover:text-destructive">
                          <Trash2 size={13} />
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
