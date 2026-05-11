import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X, Wind, ChevronDown, ChevronUp } from 'lucide-react';
import MaterialPhoto from './MaterialPhoto';
import { autoRange, hasSizeTable, PRESET_SPORTS, type SportType } from '@/lib/gear-recommend';

export interface MaterialCategory {
  id: string;
  slot: number;
  name: string;
  sport_type_id: string | null;
}
export interface MaterialItem {
  id: string;
  category_id: string;
  name: string;
  photo_url?: string | null;
  wind_min_kn?: number | null;
  wind_max_kn?: number | null;
}

const DEFAULT_NAMES = ['Tabla', 'Vela', 'Aleta', 'Otro'];

// ─── Sub-component: Sports Section ───────────────────────────────────────────

interface SportsSectionProps {
  sports: SportType[];
  onAdd: (name: string, min: number, max: number) => void;
  onDelete: (id: string) => void;
}

function SportsSection({ sports, onAdd, onDelete }: SportsSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [min, setMin] = useState(8);
  const [max, setMax] = useState(30);

  const availablePresets = PRESET_SPORTS.filter(
    p => !sports.some(s => s.name.toLowerCase() === p.name.toLowerCase())
  );

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), min, max);
    setName(''); setMin(8); setMax(30); setShowForm(false);
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-secondary/20 p-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-display text-sm font-bold">{t('sports.title')}</span>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Predefined presets not yet added */}
          {availablePresets.length > 0 && (
            <div>
              <p className="mb-1.5 text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('sports.presets')}</p>
              <div className="flex flex-wrap gap-1.5">
                {availablePresets.map(p => (
                  <button
                    key={p.name}
                    onClick={() => onAdd(p.name, p.wind_min_kn, p.wind_max_kn)}
                    className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[0.7rem] font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Existing sports */}
          {sports.length > 0 && (
            <ul className="space-y-1">
              {sports.map(s => (
                <li key={s.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs">
                  <Wind size={12} className="flex-shrink-0 text-primary" />
                  <span className="flex-1 font-medium">{s.name}</span>
                  <span className="text-[0.65rem] text-muted-foreground">{s.wind_min_kn}–{s.wind_max_kn} kn</span>
                  <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Custom sport form */}
          {showForm ? (
            <div className="space-y-2 rounded-md border border-primary/30 bg-background p-2.5">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('sports.namePlaceholder')}
                maxLength={50}
                className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs outline-none focus:border-primary"
              />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t('sports.windRange')}</span>
                <input type="number" value={min} onChange={e => setMin(Number(e.target.value))}
                  min={1} max={50} className="w-14 rounded border border-border bg-secondary px-1.5 py-1 text-center font-mono text-xs outline-none focus:border-primary" />
                <span className="text-muted-foreground">–</span>
                <input type="number" value={max} onChange={e => setMax(Number(e.target.value))}
                  min={1} max={70} className="w-14 rounded border border-border bg-secondary px-1.5 py-1 text-center font-mono text-xs outline-none focus:border-primary" />
                <span className="text-muted-foreground">kn</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleAdd} className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground hover:brightness-110">
                  <Check size={12} /> {t('common.save')}
                </button>
                <button onClick={() => setShowForm(false)} className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-[0.7rem] text-muted-foreground hover:text-primary"
            >
              <Plus size={12} /> {t('sports.addCustom')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MaterialsManager() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [cats, setCats] = useState<MaterialCategory[]>([]);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [sports, setSports] = useState<SportType[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editingItemRangeId, setEditingItemRangeId] = useState<string | null>(null);
  const [editRangeMin, setEditRangeMin] = useState('');
  const [editRangeMax, setEditRangeMax] = useState('');

  // Add-item state per slot
  const [newItem, setNewItem] = useState<Record<number, string>>({});
  const [newSize, setNewSize] = useState<Record<number, string>>({});
  const [autoRangePreview, setAutoRangePreview] = useState<Record<number, { min: number; max: number } | null>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, i, s] = await Promise.all([
      supabase.from('material_categories').select('*').order('slot'),
      supabase.from('material_items').select('*').order('name'),
      supabase.from('sport_types').select('*').order('created_at'),
    ]);
    setLoading(false);
    if (c.error || i.error || s.error) { toast.error((c.error || i.error || s.error)!.message); return; }
    setCats((c.data as MaterialCategory[]) || []);
    setItems((i.data as MaterialItem[]) || []);
    setSports((s.data as SportType[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Sports CRUD ─────────────────────────────────────────────────────────────

  const createSport = async (name: string, min: number, max: number) => {
    if (!user) return;
    const { data, error } = await supabase.from('sport_types')
      .insert({ user_id: user.id, name, wind_min_kn: min, wind_max_kn: max })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setSports(ss => [...ss, data as SportType]);
    toast.success(t('sports.saved'));
  };

  const deleteSport = async (id: string) => {
    const { error } = await supabase.from('sport_types').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setSports(ss => ss.filter(s => s.id !== id));
    toast.success(t('sports.deleted'));
  };

  // ── Category CRUD ───────────────────────────────────────────────────────────

  const ensureCategory = async (slot: number, name: string): Promise<MaterialCategory | null> => {
    if (!user) return null;
    const existing = cats.find(c => c.slot === slot);
    if (existing) {
      if (existing.name === name) return existing;
      const { error } = await supabase.from('material_categories').update({ name }).eq('id', existing.id);
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

  const updateCategorySport = async (catId: string, sportTypeId: string | null) => {
    const { error } = await supabase.from('material_categories')
      .update({ sport_type_id: sportTypeId }).eq('id', catId);
    if (error) { toast.error(error.message); return; }
    setCats(cs => cs.map(c => c.id === catId ? { ...c, sport_type_id: sportTypeId } : c));
  };

  const saveName = async (slot: number) => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('Pon un nombre'); return; }
    const ok = await ensureCategory(slot, trimmed.slice(0, 40));
    if (ok) { setEditingSlot(null); toast.success('Categoría guardada'); }
  };

  // ── Item CRUD ───────────────────────────────────────────────────────────────

  const addItem = async (slot: number) => {
    if (!user) return;
    const text = (newItem[slot] || '').trim();
    if (!text) return;

    let cat = cats.find(c => c.slot === slot);
    if (!cat) {
      cat = (await ensureCategory(slot, DEFAULT_NAMES[slot - 1])) || undefined;
      if (!cat) return;
    }

    // Auto-range from size if sport has table
    let windMin: number | null = null;
    let windMax: number | null = null;
    const sizeStr = (newSize[slot] || '').trim();
    if (sizeStr && cat.sport_type_id) {
      const sport = sports.find(s => s.id === cat!.sport_type_id);
      if (sport && hasSizeTable(sport.name)) {
        const size = parseFloat(sizeStr);
        if (!isNaN(size)) {
          const range = autoRange(sport.name, size);
          if (range) { windMin = range.min; windMax = range.max; }
        }
      }
    }

    const { data, error } = await supabase.from('material_items')
      .insert({ user_id: user.id, category_id: cat.id, name: text.slice(0, 80), wind_min_kn: windMin, wind_max_kn: windMax })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setItems(is => [...is, data as MaterialItem]);
    setNewItem(n => ({ ...n, [slot]: '' }));
    setNewSize(n => ({ ...n, [slot]: '' }));
    setAutoRangePreview(p => ({ ...p, [slot]: null }));
  };

  const deleteItem = async (id: string) => {
    const it = items.find(x => x.id === id);
    if (it?.photo_url) {
      const marker = '/material-photos/';
      const idx = it.photo_url.indexOf(marker);
      if (idx !== -1) {
        await supabase.storage.from('material-photos').remove([it.photo_url.slice(idx + marker.length)]);
      }
    }
    const { error } = await supabase.from('material_items').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.filter(x => x.id !== id));
  };

  const saveItemName = async (id: string) => {
    const trimmed = editItemName.trim();
    if (!trimmed) { toast.error('El nombre no puede estar vacío'); return; }
    const { error } = await supabase.from('material_items').update({ name: trimmed.slice(0, 80) }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.map(x => x.id === id ? { ...x, name: trimmed.slice(0, 80) } : x));
    setEditingItemId(null);
    toast.success('Nombre actualizado');
  };

  const saveItemRange = async (id: string) => {
    const min = parseInt(editRangeMin);
    const max = parseInt(editRangeMax);
    if (isNaN(min) || isNaN(max) || min >= max) { toast.error('Rango no válido'); return; }
    const { error } = await supabase.from('material_items').update({ wind_min_kn: min, wind_max_kn: max }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.map(x => x.id === id ? { ...x, wind_min_kn: min, wind_max_kn: max } : x));
    setEditingItemRangeId(null);
    toast.success(t('materials.rangeSaved'));
  };

  const clearItemRange = async (id: string) => {
    const { error } = await supabase.from('material_items').update({ wind_min_kn: null, wind_max_kn: null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(is => is.map(x => x.id === id ? { ...x, wind_min_kn: null, wind_max_kn: null } : x));
  };

  const updateItemPhoto = (id: string, newUrl: string | null) => {
    setItems(is => is.map(x => x.id === id ? { ...x, photo_url: newUrl } : x));
  };

  // ── Size input auto-range preview ───────────────────────────────────────────

  const handleSizeChange = (slot: number, val: string) => {
    setNewSize(n => ({ ...n, [slot]: val }));
    const cat = cats.find(c => c.slot === slot);
    if (!cat?.sport_type_id) { setAutoRangePreview(p => ({ ...p, [slot]: null })); return; }
    const sport = sports.find(s => s.id === cat.sport_type_id);
    if (!sport || !hasSizeTable(sport.name)) { setAutoRangePreview(p => ({ ...p, [slot]: null })); return; }
    const size = parseFloat(val);
    if (!isNaN(size) && size > 0) {
      setAutoRangePreview(p => ({ ...p, [slot]: autoRange(sport.name, size) }));
    } else {
      setAutoRangePreview(p => ({ ...p, [slot]: null }));
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando materiales...</p>;

  return (
    <div className="space-y-4">
      {/* Sports section */}
      <SportsSection sports={sports} onAdd={createSport} onDelete={deleteSport} />

      {/* Material slots */}
      {[1, 2, 3, 4].map(slot => {
        const cat = cats.find(c => c.slot === slot);
        const catItems = cat ? items.filter(i => i.category_id === cat.id) : [];
        const isEditing = editingSlot === slot;
        const sportForSlot = cat?.sport_type_id ? sports.find(s => s.id === cat.sport_type_id) : null;
        const slotHasTable = sportForSlot ? hasSizeTable(sportForSlot.name) : false;

        return (
          <div key={slot} className="rounded-lg border border-border bg-secondary/30 p-3">
            {/* Slot header */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                Slot {slot}
              </span>
              {isEditing ? (
                <div className="flex flex-1 items-center gap-1">
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} maxLength={40}
                    className="flex-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none" />
                  <button onClick={() => saveName(slot)} className="rounded bg-primary p-1 text-primary-foreground"><Check size={14} /></button>
                  <button onClick={() => setEditingSlot(null)} className="rounded border border-border p-1 text-muted-foreground"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <span className="font-display text-sm font-bold">
                    {cat?.name || <span className="italic text-muted-foreground">Sin nombre</span>}
                  </span>
                  <button onClick={() => { setEditName(cat?.name || DEFAULT_NAMES[slot - 1]); setEditingSlot(slot); }}
                    className="text-muted-foreground hover:text-primary"><Pencil size={13} /></button>
                </>
              )}

              {/* Sport selector */}
              <select
                value={cat?.sport_type_id || ''}
                onChange={e => cat && updateCategorySport(cat.id, e.target.value || null)}
                disabled={!cat}
                className="ml-auto rounded border border-border bg-secondary px-1.5 py-1 text-[0.65rem] text-foreground outline-none focus:border-primary disabled:opacity-40"
              >
                <option value="">{t('sports.noSport')}</option>
                {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Items list */}
            {cat && catItems.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {catItems.map(it => (
                  <li key={it.id} className="group rounded-md border border-border bg-background p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <MaterialPhoto
                        itemId={it.id}
                        photoUrl={it.photo_url || null}
                        onUpdated={(url) => updateItemPhoto(it.id, url)}
                        size="sm"
                      />
                      {editingItemId === it.id ? (
                        <div className="flex flex-1 items-center gap-1">
                          <input autoFocus value={editItemName} onChange={e => setEditItemName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveItemName(it.id); if (e.key === 'Escape') setEditingItemId(null); }}
                            maxLength={80}
                            className="flex-1 rounded border border-primary/40 bg-background px-2 py-0.5 text-xs outline-none" />
                          <button onClick={() => saveItemName(it.id)} className="rounded bg-primary p-1 text-primary-foreground"><Check size={12} /></button>
                          <button onClick={() => setEditingItemId(null)} className="rounded border border-border p-1 text-muted-foreground"><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{it.name}</span>
                          <button onClick={() => { setEditingItemId(it.id); setEditItemName(it.name); }}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"><Pencil size={12} /></button>
                          <button onClick={() => deleteItem(it.id)}
                            className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>

                    {/* Wind range row */}
                    {editingItemRangeId === it.id ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Wind size={11} className="text-primary" />
                        <input type="number" value={editRangeMin} onChange={e => setEditRangeMin(e.target.value)}
                          placeholder="mín" className="w-12 rounded border border-border bg-secondary px-1 py-0.5 text-center font-mono text-[0.7rem] outline-none focus:border-primary" />
                        <span className="text-muted-foreground">–</span>
                        <input type="number" value={editRangeMax} onChange={e => setEditRangeMax(e.target.value)}
                          placeholder="máx" className="w-12 rounded border border-border bg-secondary px-1 py-0.5 text-center font-mono text-[0.7rem] outline-none focus:border-primary" />
                        <span className="text-[0.65rem] text-muted-foreground">kn</span>
                        <button onClick={() => saveItemRange(it.id)} className="rounded bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-primary-foreground"><Check size={10} /></button>
                        <button onClick={() => setEditingItemRangeId(null)} className="text-muted-foreground hover:text-foreground"><X size={11} /></button>
                        {(it.wind_min_kn || it.wind_max_kn) && (
                          <button onClick={() => clearItemRange(it.id)} className="ml-auto text-[0.6rem] text-muted-foreground hover:text-destructive">
                            {t('materials.clearRange')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5">
                        {it.wind_min_kn != null && it.wind_max_kn != null ? (
                          <button
                            onClick={() => { setEditingItemRangeId(it.id); setEditRangeMin(String(it.wind_min_kn)); setEditRangeMax(String(it.wind_max_kn)); }}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-medium text-primary hover:bg-primary/20"
                          >
                            <Wind size={10} /> {it.wind_min_kn}–{it.wind_max_kn} kn
                          </button>
                        ) : (
                          <button
                            onClick={() => { setEditingItemRangeId(it.id); setEditRangeMin(''); setEditRangeMax(''); }}
                            className="text-[0.6rem] text-muted-foreground/60 hover:text-primary"
                          >
                            + {t('materials.setRange')}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add item row */}
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <input
                  value={newItem[slot] || ''}
                  onChange={e => setNewItem(n => ({ ...n, [slot]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(slot); } }}
                  placeholder={`Añadir ${cat?.name?.toLowerCase() || 'material'}...`}
                  maxLength={80}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <button onClick={() => addItem(slot)}
                  className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110">
                  <Plus size={12} /> Añadir
                </button>
              </div>

              {/* Size input (only if sport has size table) */}
              {slotHasTable && (
                <div className="flex items-center gap-2">
                  <span className="text-[0.6rem] text-muted-foreground">{t('materials.size')} ({sportForSlot?.name})</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newSize[slot] || ''}
                    onChange={e => handleSizeChange(slot, e.target.value)}
                    placeholder="ej: 7.0"
                    className="w-20 rounded border border-border bg-background px-2 py-1 text-center font-mono text-[0.7rem] outline-none focus:border-primary"
                  />
                  {autoRangePreview[slot] && (
                    <span className="text-[0.6rem] text-primary">
                      → {autoRangePreview[slot]!.min}–{autoRangePreview[slot]!.max} kn
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
