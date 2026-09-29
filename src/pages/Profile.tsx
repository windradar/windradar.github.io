import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, MessageCircle, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setWindUnit, type WindUnit } from '@/lib/wind-units';

export default function Profile() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const passwordSchema = z.string()
    .min(10, t('auth.passwordMin'))
    .max(72)
    .regex(/[a-z]/, t('auth.passwordLower'))
    .regex(/[A-Z]/, t('auth.passwordUpper'))
    .regex(/[0-9]/, t('auth.passwordNumber'))
    .regex(/[^A-Za-z0-9]/, t('auth.passwordSymbol'));

  const [displayName, setDisplayName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [callmebotApiKey, setCallmebotApiKey] = useState('');
  const [windUnits, setWindUnits] = useState<WindUnit>('kn');
  // Saving before the profile loads would overwrite it with empty values
  const [profileLoaded, setProfileLoaded] = useState(false);
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
      .select('display_name, whatsapp_number, callmebot_apikey, wind_units')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || '');
          setWhatsappNumber(data.whatsapp_number || '');
          setCallmebotApiKey(data.callmebot_apikey || '');
          setWindUnits((data.wind_units as WindUnit) || 'kn');
        }
        setProfileLoaded(true);
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user || !profileLoaded) return;
    setSavingProfile(true);
    const cleanWa = whatsappNumber.replace(/\D/g, '');
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      whatsapp_number: cleanWa || null,
      callmebot_apikey: callmebotApiKey.trim() || null,
      wind_units: windUnits,
    }).eq('user_id', user.id);
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    setWindUnit(windUnits);
    toast.success(t('profile.profileUpdated'));
  };

  const changePassword = async () => {
    if (newPass !== confirmPass) { toast.error(t('profile.passwordMismatch')); return; }
    const parsed = passwordSchema.safeParse(newPass);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setSavingPass(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('profile.passwordUpdated'));
    setNewPass(''); setConfirmPass('');
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(t('profile.resetEmailSent'));
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.from('material_items').delete().eq('user_id', user.id);
      await supabase.from('material_categories').delete().eq('user_id', user.id);
      // list() returns at most `limit` files: collect every page before removing
      const paths: string[] = [];
      for (let offset = 0; ; offset += 100) {
        const { data: files, error: listError } = await supabase.storage.from('material-photos')
          .list(user.id, { limit: 100, offset });
        if (listError) throw listError;
        paths.push(...(files ?? []).map(f => `${user.id}/${f.name}`));
        if (!files || files.length < 100) break;
      }
      for (let i = 0; i < paths.length; i += 100) {
        const { error: removeError } = await supabase.storage.from('material-photos').remove(paths.slice(i, i + 100));
        if (removeError) throw removeError;
      }
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;
      await signOut();
      navigate('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error');
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> {t('common.back')}
        </Link>

        <h1 className="mb-6 font-display text-2xl font-extrabold">👤 {t('profile.title')}</h1>

        {/* Datos de cuenta */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider">{t('profile.accountData')}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">{t('profile.emailLabel')}</label>
              <input value={user?.email || ''} disabled className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">{t('profile.nameLabel')}</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60}
                placeholder={t('profile.namePlaceholder')}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        </section>

        {/* Preferencias */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider">{t('profile.preferences')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">{t('profile.windUnits')}</label>
              <div className="flex gap-2">
                {(['kn', 'kmh', 'ms'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setWindUnits(u)}
                    aria-pressed={windUnits === u}
                    className={`rounded-md border px-4 py-2 text-sm font-bold transition-colors ${
                      windUnits === u
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                  >
                    {u === 'kn' ? t('profile.knots') : u === 'kmh' ? 'km/h' : 'm/s'}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[0.65rem] text-muted-foreground">{t('profile.windUnitsHint')}</p>
            </div>

            <button onClick={saveProfile} disabled={savingProfile || !profileLoaded}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {savingProfile ? t('common.saving') : t('profile.saveChanges')}
            </button>
          </div>
        </section>

        {/* WhatsApp */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
            <MessageCircle size={15} className="text-green-500" /> {t('profile.whatsappTitle')}
          </h2>
          <p className="mb-3 text-[0.68rem] text-muted-foreground">{t('profile.whatsappDesc')}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">{t('profile.whatsappNumber')}</label>
              <input
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="34612345678"
                maxLength={20}
                inputMode="tel"
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">{t('profile.callmebotApiKey')}</label>
              <input
                value={callmebotApiKey}
                onChange={e => setCallmebotApiKey(e.target.value)}
                placeholder="1234567"
                maxLength={20}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-[0.62rem] text-muted-foreground">{t('profile.callmebotHint')}</p>
            </div>
            <button onClick={saveProfile} disabled={savingProfile || !profileLoaded}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {savingProfile ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </section>

        {/* Cambiar contraseña */}
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider">{t('profile.changePassword')}</h2>
          <div className="space-y-3">
            <input type="password" placeholder={t('profile.newPassword')} value={newPass} onChange={e => setNewPass(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <input type="password" placeholder={t('profile.confirmPassword')} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <p className="text-[0.65rem] text-muted-foreground">{t('profile.passwordHint')}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={changePassword} disabled={savingPass || !newPass}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {savingPass ? t('common.saving') : t('profile.changePasswordBtn')}
              </button>
              <button onClick={sendReset}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
                {t('profile.sendResetEmail')}
              </button>
            </div>
          </div>
        </section>

        {/* Eliminar cuenta */}
        <section className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-destructive">
            <TriangleAlert size={15} /> {t('profile.deleteAccount')}
          </h2>
          <p className="mb-4 text-[0.68rem] text-muted-foreground">
            {t('profile.deleteWarning')} <strong>{t('profile.deleteWarningBold')}</strong>
          </p>
          <label className="mb-4 flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteConfirmed}
              onChange={e => setDeleteConfirmed(e.target.checked)}
              className="mt-0.5 accent-destructive"
            />
            <span className="text-xs text-muted-foreground">{t('profile.deleteCheckbox')}</span>
          </label>
          <button
            onClick={deleteAccount}
            disabled={!deleteConfirmed || deleting}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? t('common.deleting') : t('profile.deleteBtn')}
          </button>
        </section>
      </div>
    </div>
  );
}
