import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { kmhToKnots, windInfo, humanDate, LANG_LOCALE, type WeatherData, type MarineData } from '@/lib/weather-helpers';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wx: WeatherData;
  mar: MarineData | null;
  name: string;
  date: string;
  dayIdxs: number[];
  whatsappNumber?: string;
}

export function WhatsAppShareModal({ open, onOpenChange, wx, mar, name, date, dayIdxs, whatsappNumber }: Props) {
  const { t, i18n } = useTranslation();
  const langLocale = LANG_LOCALE[i18n.language] || 'es-ES';
  const h = wx.hourly;
  const hours = dayIdxs.map(i => h.time[i].slice(11, 16));
  const [fromH, setFromH] = useState(hours[0] || '00:00');
  const [toH, setToH] = useState(hours[hours.length - 1] || '23:00');

  const wmoEmoji = (code: number) => {
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code === 3) return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌦️';
    if (code <= 65) return '🌧️';
    if (code <= 75) return '🌨️';
    if (code <= 82) return '🌧️';
    if (code <= 99) return '⛈️';
    return '☁️';
  };

  const share = () => {
    const idxs = dayIdxs.filter(i => {
      const hr = h.time[i].slice(11, 16);
      return hr >= fromH && hr <= toH;
    });
    if (!idxs.length) return;

    let msg = `💨 *WindFlowRadar – ${name}*\n📅 ${humanDate(date, langLocale)} (${fromH}–${toH})\n\n`;
    for (const idx of idxs) {
      const ws = Math.round(h.wind_speed_10m[idx] || 0);
      const wg = Math.round(h.wind_gusts_10m[idx] || 0);
      const wd = h.wind_direction_10m[idx] || 0;
      const wi = windInfo(wd);
      const wh = mar?.hourly?.wave_height?.[idx] ?? null;
      const wc = h.weathercode?.[idx] ?? 0;
      const hr = h.time[idx].slice(11, 16);
      msg += `${wmoEmoji(wc)} *${hr}* — 💨 ${Math.round(kmhToKnots(ws))}kn ⚡raf.${Math.round(kmhToKnots(wg))}kn 🧭${wi.short} 🌊${wh !== null ? wh.toFixed(1) + 'm' : '-'}\n`;
    }
    msg += `\n_WindFlowRadar · Open-Meteo_\n\nMás información en https://windradar.github.io/`;

    if (navigator.share) {
      navigator.share({ text: msg }).catch(() => {});
      onOpenChange(false);
      return;
    }
    navigator.clipboard.writeText(msg).then(() => {
      toast.success(t('index.copiedMsg'));
      onOpenChange(false);
    }).catch(() => {
      const base = whatsappNumber ? `https://wa.me/${whatsappNumber}` : 'https://wa.me';
      window.open(`${base}?text=${encodeURIComponent(msg)}`, '_blank');
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="flex items-center gap-2 text-sm font-bold">
          <span className="text-[#25D366]"><WhatsAppIcon size={18} /></span>
          {t('nav.shareWhatsapp')}
        </DialogTitle>

        <p className="text-xs text-muted-foreground">{name} · {humanDate(date, langLocale)}</p>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              {t('index.shareFrom')}
            </label>
            <select
              value={fromH}
              onChange={e => setFromH(e.target.value)}
              className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary"
            >
              {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              {t('index.shareTo')}
            </label>
            <select
              value={toH}
              onChange={e => setToH(e.target.value)}
              className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary"
            >
              {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={share}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1ebe5d]"
        >
          <WhatsAppIcon size={16} />
          {t('index.shareBtn')}
        </button>
      </DialogContent>
    </Dialog>
  );
}
