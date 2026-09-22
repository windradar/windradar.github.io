import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { Sport } from './MaterialsManager';

interface Props {
  sports: Sport[];
  value: string | null;
  onChange: (sportId: string | null) => void;
  onCreated: (sport: Sport) => void;
}

export default function SportSelect({ sports, value, onChange, onCreated }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const addSport = async () => {
    if (!user) return;
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const { data, error } = await supabase.from('sports')
      .insert({ user_id: user.id, name: name.slice(0, 40) })
      .select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const created = data as Sport;
    onCreated(created);
    onChange(created.id);
    setNewName('');
    setAdding(false);
    toast.success(t('sessions.sportAdded'));
  };

  return (
    <div>
      <label className="mb-1 block text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {t('sessions.sportLabel')}
      </label>
      {adding ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addSport(); }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder={t('sessions.sportNewPlaceholder')}
            maxLength={40}
            className="flex-1 rounded-md border border-primary/40 bg-secondary px-2 py-2 text-sm outline-none"
          />
          <button onClick={addSport} disabled={saving || !newName.trim()}
            className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            ✓
          </button>
          <button onClick={() => setAdding(false)}
            className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
            ✕
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            className="flex-1 rounded-md border border-border bg-secondary px-2 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">{t('sessions.sportNone')}</option>
            {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setAdding(true); setNewName(''); }}
            title={t('sessions.sportNewPlaceholder')}
            className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-2 text-xs font-bold text-primary hover:bg-primary/20"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
