import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, MessageCircle, TriangleAlert } from 'lucide-react';

const passwordSchema = z.string()
  .min(10, 'Mínimo 10 caracteres')
  .max(72)
  .regex(/[a-z]/, 'Necesita una minúscula')
  .regex(/[A-Z]/, 'Necesita una mayúscula')
  .regex(/[0-9]/, 'Necesita un número')
  .regex(/[^A-Za-z0-9]/, 'Necesita un símbolo');

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [windUnits, setWindUnits] = useState<'kn' | 'kmh' | 'ms'>('kn');
  const [dateFormat, setDateFormat] = useState<'dmy' | 'mdy' | 'iso'>('dmy');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, whatsapp_number, wind_units, date_format')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || '');
          setWhatsappNumber(data.whatsapp_number || '');
          setWindUnits((data.wind_units as 'kn' | 'kmh' | 'ms') || 'kn');
          setDateFormat((data.date_format as 'dmy' | 'mdy' | 'iso') || 'dmy');
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const cleanWa = whatsappNumber.replace(/\D/g, '');
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      whatsapp_number: cleanWa || null,
      wind_units: windUnits,
      date_format: dateFormat,
    }).eq('user_id', user.id);
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

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Delete material items and categories (no CASCADE from auth.users)
      await supabase.from('material_items').delete().eq('user_id', user.id);
      await supabase.from('material_categories').delete().eq('user_id', user.id);

      // Delete storage files in material-photos/{user_id}/
      const { data: files } = await supabase.storage.from('material-photos').list(user.id);
      if (files && files.length > 0) {
        const paths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('material-photos').remove(paths);
      }

      // Delete auth user (cascades to profiles + training_sessions)
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;

      await signOut();
      navigate('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar la cuenta';
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> Volver
        </Link>

        <h1 className="mb-6 font-display text-2xl font-extrabold">👤 Perfil</h1>

        {/* Datos de cuenta */}
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
                placeholder="Tu nombre o alias"
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        </section>

        {/* Preferencias */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider">Preferencias</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Unidades de viento</label>
              <div className="flex gap-2">
                {(['kn', 'kmh', 'ms'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setWindUnits(u)}
                    className={`rounded-md border px-4 py-2 text-sm font-bold transition-colors ${
                      windUnits === u
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                  >
                    {u === 'kn' ? 'Nudos (kn)' : u === 'kmh' ? 'km/h' : 'm/s'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Formato de fecha</label>
              <div className="flex gap-2 flex-wrap">
                {(['dmy', 'mdy', 'iso'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setDateFormat(f)}
                    className={`rounded-md border px-4 py-2 text-sm font-bold transition-colors ${
                      dateFormat === f
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                  >
                    {f === 'dmy' ? 'dd/mm/aaaa' : f === 'mdy' ? 'mm/dd/aaaa' : 'aaaa-mm-dd'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={saveProfile} disabled={savingProfile}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {savingProfile ? '...' : 'Guardar cambios'}
            </button>
          </div>
        </section>

        {/* WhatsApp */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
            <MessageCircle size={15} className="text-green-500" /> WhatsApp predeterminado
          </h2>
          <p className="mb-3 text-[0.68rem] text-muted-foreground">
            Al pulsar "Compartir" en la previsión se abrirá directamente este contacto con el mensaje listo para enviar.
            Número en formato internacional sin espacios ni <code>+</code> (ej: <code>34612345678</code>).
          </p>
          <div className="space-y-3">
            <input
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="34612345678"
              maxLength={20}
              inputMode="tel"
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <button onClick={saveProfile} disabled={savingProfile}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {savingProfile ? '...' : 'Guardar'}
            </button>
          </div>
        </section>

        {/* Cambiar contraseña */}
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

        {/* Eliminar cuenta */}
        <section className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-destructive">
            <TriangleAlert size={15} /> Eliminar cuenta
          </h2>
          <p className="mb-4 text-[0.68rem] text-muted-foreground">
            Esto borrará de forma permanente todos tus datos: sesiones, materiales e imágenes.
            La eliminación completa puede tardar hasta 30 días. <strong>Esta acción no se puede deshacer.</strong>
          </p>
          <label className="mb-4 flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteConfirmed}
              onChange={e => setDeleteConfirmed(e.target.checked)}
              className="mt-0.5 accent-destructive"
            />
            <span className="text-xs text-muted-foreground">
              Entiendo que esta acción es irreversible y perderé todos mis datos.
            </span>
          </label>
          <button
            onClick={deleteAccount}
            disabled={!deleteConfirmed || deleting}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
          </button>
        </section>

      </div>
    </div>
  );
}
