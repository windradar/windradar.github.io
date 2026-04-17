import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const passwordSchema = z.string()
  .min(10, 'Mínimo 10 caracteres')
  .max(72)
  .regex(/[a-z]/, 'Necesita una minúscula')
  .regex(/[A-Z]/, 'Necesita una mayúscula')
  .regex(/[0-9]/, 'Necesita un número')
  .regex(/[^A-Za-z0-9]/, 'Necesita un símbolo');

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setDisplayName(data.display_name || ''); });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('user_id', user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success('Perfil actualizado');
  };

  const changePassword = async () => {
    if (newPass !== confirmPass) { toast.error('Las contraseñas no coinciden'); return; }
    const parsed = passwordSchema.safeParse(newPass);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setSavingPass(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Contraseña actualizada');
    setNewPass(''); setConfirmPass('');
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Email de restauración enviado');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> Volver
        </Link>

        <h1 className="mb-6 font-display text-2xl font-extrabold">👤 Perfil</h1>

        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider">Datos de cuenta</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Email</label>
              <input value={user?.email || ''} disabled className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Nombre / Alias</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <button onClick={saveProfile} disabled={savingProfile}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {savingProfile ? '...' : 'Guardar perfil'}
            </button>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider">Cambiar contraseña</h2>
          <div className="space-y-3">
            <input type="password" placeholder="Nueva contraseña" value={newPass} onChange={e => setNewPass(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <input type="password" placeholder="Confirmar contraseña" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <p className="text-[0.65rem] text-muted-foreground">
              Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={changePassword} disabled={savingPass || !newPass}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {savingPass ? '...' : 'Cambiar contraseña'}
              </button>
              <button onClick={sendReset}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
                Enviar email de restauración
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
