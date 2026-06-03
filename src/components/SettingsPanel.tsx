import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

export interface AppSettings {
  minWindKn: number;
  gridFromHour: string;
  gridToHour: string;
  emailEnabled: boolean;
  emailAddress: string;
  emailLocation: string;
  emailTime1: string;
  emailTime2: string;
  emailRangeFrom: string;
  emailRangeTo: string;
  whatsappAlertEnabled: boolean;
  callmebotApiKey: string;
  whatsappAlertLocation: string;
  whatsappAlertTime1: string;
  whatsappAlertTime2: string;
  whatsappAlertRangeFrom: string;
  whatsappAlertRangeTo: string;
}

const STORAGE_KEY = 'windradar-settings';

const defaultSettings: AppSettings = {
  minWindKn: 10,
  gridFromHour: '00:00',
  gridToHour: '23:00',
  emailEnabled: false,
  emailAddress: '',
  emailLocation: '',
  emailTime1: '07:00',
  emailTime2: '',
  emailRangeFrom: '06:00',
  emailRangeTo: '20:00',
  whatsappAlertEnabled: false,
  callmebotApiKey: '',
  whatsappAlertLocation: '',
  whatsappAlertTime1: '07:00',
  whatsappAlertTime2: '',
  whatsappAlertRangeFrom: '06:00',
  whatsappAlertRangeTo: '20:00',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultSettings };
}

function saveDisplaySettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    minWindKn: s.minWindKn,
    gridFromHour: s.gridFromHour,
    gridToHour: s.gridToHour,
  }));
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=es&format=json`
    );
    const data = await res.json();
    if (data.results?.length) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
  } catch {}
  return null;
}

export function SettingsPanel({
  settings,
  onChange,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [local, setLocal] = useState<AppSettings>(settings);
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    controlledOnOpenChange?.(v);
  };

  useEffect(() => {
    setLocal(prev => ({ ...prev, minWindKn: settings.minWindKn, gridFromHour: settings.gridFromHour, gridToHour: settings.gridToHour }));
  }, [settings]);

  // Load email settings from Supabase when dialog opens
  useEffect(() => {
    if (!open || !user) return;
    setEmailLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('email_notif_enabled, email_notif_address, email_notif_location, email_notif_time1, email_notif_time2, email_notif_range_from, email_notif_range_to, whatsapp_alert_enabled, callmebot_apikey, whatsapp_alert_location, whatsapp_alert_time1, whatsapp_alert_time2, whatsapp_alert_range_from, whatsapp_alert_range_to')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setLocal(prev => ({
            ...prev,
            emailEnabled:          data.email_notif_enabled ?? false,
            emailAddress:          data.email_notif_address ?? '',
            emailLocation:         data.email_notif_location ?? '',
            emailTime1:            data.email_notif_time1 ?? '07:00',
            emailTime2:            data.email_notif_time2 ?? '',
            emailRangeFrom:        data.email_notif_range_from ?? '06:00',
            emailRangeTo:          data.email_notif_range_to ?? '20:00',
            whatsappAlertEnabled:  data.whatsapp_alert_enabled ?? false,
            callmebotApiKey:       data.callmebot_apikey ?? '',
            whatsappAlertLocation: data.whatsapp_alert_location ?? '',
            whatsappAlertTime1:    data.whatsapp_alert_time1 ?? '07:00',
            whatsappAlertTime2:    data.whatsapp_alert_time2 ?? '',
            whatsappAlertRangeFrom: data.whatsapp_alert_range_from ?? '06:00',
            whatsappAlertRangeTo:   data.whatsapp_alert_range_to ?? '20:00',
          }));
        }
      } finally {
        setEmailLoading(false);
      }
    })();
  }, [open, user]);

  const update = (patch: Partial<AppSettings>) => setLocal(prev => ({ ...prev, ...patch }));

  const handleTestEmail = async () => {
    if (!user) { toast.error(t('settings.loginRequired')); return; }
    setTestingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-forecast-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[Email test] response:', JSON.stringify(data));
      const results: string[] = data?.results ?? [];
      if (results.length === 0) {
        toast.error(t('settings.testEmailNoConfig'));
      } else {
        toast.success(results[0]);
      }
    } catch (err) {
      console.error('[Email test]', err);
      toast.error(t('settings.testEmailError'));
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestWhatsapp = async () => {
    if (!user) { toast.error(t('settings.loginRequired')); return; }
    if (!local.callmebotApiKey.trim()) { toast.error(t('settings.callmebotApiKeyRequired')); return; }
    setTestingWa(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-alerts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[WA test] response:', JSON.stringify(data));
      const results: string[] = data?.results ?? [];
      if (results.length === 0) {
        toast.error(t('settings.testWhatsappNoConfig'));
      } else {
        toast.success(results[0]);
      }
    } catch (err) {
      console.error('[WA test]', err);
      toast.error(t('settings.testWhatsappError'));
    } finally {
      setTestingWa(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    // Always save display settings to localStorage
    saveDisplaySettings(local);
    onChange(local);

    // Email settings require login
    if (local.emailEnabled && !user) {
      toast.error(t('settings.loginRequired'));
      setSaving(false);
      setOpen(false);
      return;
    }

    if (user) {
      let lat: number | null = null;
      let lon: number | null = null;

      if (local.emailEnabled && local.emailLocation.trim()) {
        const geo = await geocode(local.emailLocation.trim());
        if (!geo) {
          toast.error(t('settings.geoError'));
          setSaving(false);
          return;
        }
        lat = geo.lat;
        lon = geo.lon;
      }

      let waLat: number | null = null;
      let waLon: number | null = null;
      if (local.whatsappAlertEnabled && local.whatsappAlertLocation.trim()) {
        const geo = await geocode(local.whatsappAlertLocation.trim());
        if (!geo) {
          toast.error(t('settings.geoError'));
          setSaving(false);
          return;
        }
        waLat = geo.lat;
        waLon = geo.lon;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          email_notif_enabled:       local.emailEnabled,
          email_notif_address:       local.emailAddress.trim() || null,
          email_notif_location:      local.emailLocation.trim() || null,
          email_notif_lat:           lat,
          email_notif_lon:           lon,
          email_notif_time1:         local.emailTime1,
          email_notif_time2:         local.emailTime2 || null,
          email_notif_range_from:    local.emailRangeFrom,
          email_notif_range_to:      local.emailRangeTo,
          email_notif_min_wind:      local.minWindKn,
          whatsapp_alert_enabled:    local.whatsappAlertEnabled,
          callmebot_apikey:          local.callmebotApiKey.trim() || null,
          whatsapp_alert_location:   local.whatsappAlertLocation.trim() || null,
          whatsapp_alert_lat:        waLat,
          whatsapp_alert_lon:        waLon,
          whatsapp_alert_time1:      local.whatsappAlertTime1,
          whatsapp_alert_time2:      local.whatsappAlertTime2 || null,
          whatsapp_alert_range_from: local.whatsappAlertRangeFrom,
          whatsapp_alert_range_to:   local.whatsappAlertRangeTo,
        })
        .eq('user_id', user.id);

      if (error) {
        toast.error(t('settings.saveError'));
        setSaving(false);
        return;
      }

      if (local.emailEnabled) toast.success(t('settings.emailSaved'));
      if (local.whatsappAlertEnabled) toast.success(t('settings.whatsappAlertSaved'));
    }

    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <button className="rounded-lg border border-border bg-transparent px-3 py-2 font-display text-[0.72rem] font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary sm:px-4 sm:text-[0.78rem]">
            {t('settings.title')}
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section>
            <h4 className="mb-2 text-sm font-bold text-foreground">{t('settings.windThreshold')}</h4>
            <p className="mb-3 text-[0.7rem] text-muted-foreground">{t('settings.windThresholdDesc')}</p>
            <div className="flex items-center gap-4">
              <Slider
                value={[local.minWindKn]}
                onValueChange={([v]) => update({ minWindKn: v })}
                min={5} max={30} step={1}
                className="flex-1"
              />
              <span className="w-14 rounded-md border border-border bg-secondary px-2 py-1 text-center font-mono text-sm font-bold text-foreground">
                {local.minWindKn} kn
              </span>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-bold text-foreground">{t('settings.hourRange')}</h4>
            <p className="mb-3 text-[0.7rem] text-muted-foreground">{t('settings.hourRangeDesc')}</p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.from')}</label>
                <select value={local.gridFromHour} onChange={e => update({ gridFromHour: e.target.value })}
                  className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                  {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.to')}</label>
                <select value={local.gridToHour} onChange={e => update({ gridToHour: e.target.value })}
                  className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                  {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{t('settings.emailNotif')}</h4>
              <Switch checked={local.emailEnabled} onCheckedChange={v => update({ emailEnabled: v })} disabled={emailLoading} />
            </div>
            <p className="mb-3 text-[0.7rem] text-muted-foreground">{t('settings.emailNotifDesc')}</p>

            {!user && local.emailEnabled && (
              <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[0.7rem] text-amber-700">
                {t('settings.loginRequired')}
              </p>
            )}

            <div className={`space-y-3 transition-opacity ${local.emailEnabled ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>
              <div className="flex flex-col gap-1">
                <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.emailLabel')}</label>
                <input value={local.emailAddress} onChange={e => update({ emailAddress: e.target.value })}
                  type="email" placeholder="tu@email.com"
                  className="rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-[0.78rem] text-foreground outline-none focus:border-primary" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.locationLabel')}</label>
                <input value={local.emailLocation} onChange={e => update({ emailLocation: e.target.value })}
                  placeholder="Ej: Gavà, España"
                  className="rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-[0.78rem] text-foreground outline-none focus:border-primary" />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.sendTime1')}</label>
                  <select value={local.emailTime1} onChange={e => update({ emailTime1: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                    {t('settings.sendTime2')} <span className="normal-case text-muted-foreground">{t('settings.optional')}</span>
                  </label>
                  <select value={local.emailTime2} onChange={e => update({ emailTime2: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    <option value="">{t('settings.disabled')}</option>
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.rangeFrom')}</label>
                  <select value={local.emailRangeFrom} onChange={e => update({ emailRangeFrom: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.rangeTo')}</label>
                  <select value={local.emailRangeTo} onChange={e => update({ emailRangeTo: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-[0.67rem] leading-relaxed text-muted-foreground">
                <strong className="text-primary">ℹ️</strong> {t('settings.emailNote')}
              </div>

              <button
                onClick={handleTestEmail}
                disabled={testingEmail || !user}
                className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[0.75rem] font-semibold text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {testingEmail ? t('settings.testEmailSending') : t('settings.testEmail')}
              </button>
            </div>
          </section>

          {/* WhatsApp automatic alert */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{t('settings.whatsappAlert')}</h4>
              <Switch checked={local.whatsappAlertEnabled} onCheckedChange={v => update({ whatsappAlertEnabled: v })} disabled={emailLoading} />
            </div>
            <p className="mb-3 text-[0.7rem] text-muted-foreground">{t('settings.whatsappAlertDesc')}</p>

            {!user && local.whatsappAlertEnabled && (
              <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[0.7rem] text-amber-700">
                {t('settings.loginRequired')}
              </p>
            )}

            <div className={`space-y-3 transition-opacity ${local.whatsappAlertEnabled ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>
              <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3 text-[0.67rem] leading-relaxed text-muted-foreground">
                <strong className="text-green-600">📱</strong> {t('settings.callmebotActivation')}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.callmebotApiKey')}</label>
                <input
                  value={local.callmebotApiKey}
                  onChange={e => update({ callmebotApiKey: e.target.value })}
                  placeholder="1234567"
                  className="rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-[0.78rem] text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.locationLabel')}</label>
                <input
                  value={local.whatsappAlertLocation}
                  onChange={e => update({ whatsappAlertLocation: e.target.value })}
                  placeholder="Ej: Gavà, España"
                  className="rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-[0.78rem] text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.sendTime1')}</label>
                  <select value={local.whatsappAlertTime1} onChange={e => update({ whatsappAlertTime1: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                    {t('settings.sendTime2')} <span className="normal-case text-muted-foreground">{t('settings.optional')}</span>
                  </label>
                  <select value={local.whatsappAlertTime2} onChange={e => update({ whatsappAlertTime2: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    <option value="">{t('settings.disabled')}</option>
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.rangeFrom')}</label>
                  <select value={local.whatsappAlertRangeFrom} onChange={e => update({ whatsappAlertRangeFrom: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">{t('settings.rangeTo')}</label>
                  <select value={local.whatsappAlertRangeTo} onChange={e => update({ whatsappAlertRangeTo: e.target.value })}
                    className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary">
                    {ALL_HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-[0.67rem] leading-relaxed text-muted-foreground">
                <strong className="text-primary">ℹ️</strong> {t('settings.whatsappAlertNote')}
              </div>

              <button
                onClick={handleTestWhatsapp}
                disabled={testingWa || !user}
                className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-[0.75rem] font-semibold text-green-700 transition-all hover:bg-green-500/20 disabled:opacity-50 dark:text-green-400"
              >
                <Send className="h-3.5 w-3.5" />
                {testingWa ? t('settings.testWhatsappSending') : t('settings.testWhatsapp')}
              </button>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary">
            {t('settings.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
