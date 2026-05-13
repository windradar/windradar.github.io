import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { kmhToKnots, windInfo, humanDate, type WeatherData, type MarineData } from '@/lib/weather-helpers';

const LANG_LOCALE: Record<string, string> = {
  es: 'es-ES', ca: 'ca-ES', en: 'en-GB', fr: 'fr-FR',
};

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

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
    msg += `\n_WindFlowRadar · Open-Meteo_`;

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
