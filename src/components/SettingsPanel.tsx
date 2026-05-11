import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from 'react-i18next';

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
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultSettings };
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

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
  const [local, setLocal] = useState<AppSettings>(settings);
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    controlledOnOpenChange?.(v);
  };

  useEffect(() => { setLocal(settings); }, [settings]);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
  };

  const handleSave = () => {
    saveSettings(local);
    onChange(local);
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
                min={5}
                max={30}
                step={1}
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
              <Switch checked={local.emailEnabled} onCheckedChange={v => update({ emailEnabled: v })} />
            </div>
            <p className="mb-3 text-[0.7rem] text-muted-foreground">{t('settings.emailNotifDesc')}</p>

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
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary">
            {t('settings.cancel')}
          </button>
          <button onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-110">
            {t('settings.save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
