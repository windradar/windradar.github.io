import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordSchema = z.string()
    .min(10, t('auth.passwordMin'))
    .max(72)
    .regex(/[a-z]/, t('auth.passwordLower'))
    .regex(/[A-Z]/, t('auth.passwordUpper'))
    .regex(/[0-9]/, t('auth.passwordNumber'))
    .regex(/[^A-Za-z0-9]/, t('auth.passwordSymbol'));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error(t('resetPassword.passwordMismatch')); return; }
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    toast.success(t('resetPassword.success'));
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-4 font-display text-xl font-bold">{t('resetPassword.title')}</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">{t('resetPassword.validating')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" placeholder={t('resetPassword.newPassword')} value={password} onChange={e => setPassword(e.target.value)} required minLength={10}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <input type="password" placeholder={t('resetPassword.confirmPassword')} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={10}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
            <button type="submit" disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
              {submitting ? '...' : t('resetPassword.updateBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
