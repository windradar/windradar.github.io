import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Sport } from './MaterialsManager';

export default function SportsManager() {
  const { user } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('sports').select('*').order('sort_order').order('name');
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSports((data as Sport[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addSport = async () => {
    if (!user) return;
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await supabase.from('sports')
      .insert({ user_id: user.id, name: name.slice(0, 40) })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setSports(s => [...s, data as Sport]);
    setNewName('');
  };

  const deleteSport = async (sport: Sport) => {
    if (!confirm(`¿Eliminar el deporte "${sport.name}"? Los slots asociados quedarán sin deporte.`)) return;
    const { error } = await supabase.from('sports').delete().eq('id', sport.id);
    if (error) { toast.error(error.message); return; }
    setSports(s => s.filter(x => x.id !== sport.id));
  };

  const startEdit = (sport: Sport) => {
    setEditingId(sport.id);
    setEditName(sport.name);
  };

  const saveEdit = async (sport: Sport) => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('Pon un nombre'); return; }
    const { error } = await supabase.from('sports').update({ name: trimmed.slice(0, 40) }).eq('id', sport.id);
    if (error) { toast.error(error.message); return; }
    setSports(s => s.map(x => x.id === sport.id ? { ...x, name: trimmed.slice(0, 40) } : x));
    setEditingId(null);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando deportes...</p>;

  return (
    <div className="space-y-2">
      {sports.length === 0 && (
        <p className="py-2 text-xs text-muted-foreground">
          Aún no has creado ningún deporte. Añade uno (Windsurf, Kite, Wing Foil, SUP...) y luego asocia tus slots de material a él en la lista de abajo.
        </p>
      )}
      {sports.map(sport => (
        <div key={sport.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-2">
          {editingId === sport.id ? (
            <div className="flex flex-1 items-center gap-1">
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} maxLength={40}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(sport); } if (e.key === 'Escape') setEditingId(null); }}
                className="flex-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none" />
              <button onClick={() => saveEdit(sport)} className="rounded bg-primary p-1 text-primary-foreground">
                <Check size={14} />
              </button>
              <button onClick={() => setEditingId(null)} className="rounded border border-border p-1 text-muted-foreground">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium">{sport.name}</span>
              <button onClick={() => startEdit(sport)} className="text-muted-foreground hover:text-primary">
                <Pencil size={13} />
              </button>
              <button onClick={() => deleteSport(sport)} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-1 pt-1">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSport(); } }}
          placeholder="Ej: Windsurf" maxLength={40}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
        <button onClick={addSport}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110">
          <Plus size={12} /> Añadir deporte
        </button>
      </div>
    </div>
  );
}
