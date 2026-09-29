import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bell, BellOff, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { disablePush, enablePush, getPushStatus, type PushStatus } from '@/lib/push';

const STATUS_MESSAGE: Partial<Record<PushStatus, string>> = {
  'ios-install': 'settings.pushIosInstall',
  unsupported: 'settings.pushUnsupported',
  denied: 'settings.pushDenied',
};

export function PushAlertSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPushStatus(user.id).then(setStatus).catch(() => setStatus('unsupported'));
  }, [user]);

  const handleToggle = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const next = status === 'on' ? await disablePush(user.id) : await enablePush(user.id);
      setStatus(next);
      if (next === 'on') toast.success(t('settings.pushEnabled'));
      else if (status === 'on') toast.success(t('settings.pushDisabled'));
    } catch (err) {
      // Browser/push-service errors vary a lot (Brave, blocked OS notifications…); show the cause
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : (err as { message?: string })?.message;
      toast.error(t('settings.pushError'), { description: detail });
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (!user) return;
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-alerts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );
      if (res.status === 429) { toast.error(t('settings.testTooSoon')); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.sent) {
        toast.error(t('settings.testPushNoDevice'));
      } else {
        toast.success(data.results?.[0] ?? t('settings.testPushSent'));
      }
    } catch {
      toast.error(t('settings.testPushError'));
    } finally {
      setTesting(false);
    }
  };

  const message = status ? STATUS_MESSAGE[status] : undefined;
  const canToggle = status === 'on' || status === 'off';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-[0.8rem] font-bold text-foreground">{t('settings.pushAlert')}</h5>
        {status === 'on' && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-widest text-primary">
            {t('settings.pushOnBadge')}
          </span>
        )}
      </div>
      <p className="text-[0.7rem] text-muted-foreground">{t('settings.pushAlertDesc')}</p>

      {!user && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[0.7rem] text-amber-700">
          {t('settings.loginRequired')}
        </p>
      )}

      {message && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[0.7rem] text-amber-700">
          {t(message)}
        </p>
      )}

      {user && canToggle && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleToggle}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[0.75rem] font-semibold text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
          >
            {status === 'on' ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {busy ? t('settings.saving') : status === 'on' ? t('settings.pushDisable') : t('settings.pushEnable')}
          </button>
          {status === 'on' && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[0.75rem] font-semibold text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {testing ? t('settings.testWhatsappSending') : t('settings.testPush')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
