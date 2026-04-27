import { useRef, useEffect, useState, useCallback } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { humanDate, dirArrow, windInfo } from '@/lib/weather-helpers';
import { toast } from 'sonner';

interface Snapshot {
  hour: string;
  wind_kn: number;
  gust_kn: number;
  dir_deg: number;
  dir_short: string;
  wave_m: number | null;
  temp: number | null;
}

interface Session {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  location_lat: number | null;
  location_lon: number | null;
  weather_snapshot: Snapshot[] | null;
  material_1: string | null;
  material_2: string | null;
  material_3: string | null;
  material_4: string | null;
  tracking_url: string | null;
  notes: string | null;
}

interface Props {
  session: Session | null;
  materialPhotos: Record<string, string>;
  onClose: () => void;
}

const CW = 1080;
const CH = 1920;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function fetchAsBlobUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function getStats(session: Session) {
  const snap = (session.weather_snapshot as Snapshot[]) ?? [];
  if (!snap.length) return null;
  const windAvg = Math.round(snap.reduce((s, h) => s + h.wind_kn, 0) / snap.length);
  const gustMax = Math.max(...snap.map(h => h.gust_kn));
  const sinDeg = snap.reduce((s, h) => s + Math.sin((h.dir_deg * Math.PI) / 180), 0) / snap.length;
  const cosDeg = snap.reduce((s, h) => s + Math.cos((h.dir_deg * Math.PI) / 180), 0) / snap.length;
  const dirAvg = Math.round(((Math.atan2(sinDeg, cosDeg) * 180) / Math.PI + 360) % 360);
  const dirShort = windInfo(dirAvg).short;
  const waves = snap.map(h => h.wave_m).filter((v): v is number => v !== null);
  const waveAvg = waves.length ? waves.reduce((s, v) => s + v, 0) / waves.length : null;
  return { windAvg, gustMax, dirAvg, dirShort, waveAvg };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
): number {
  const words = text.split(' ');
  let line = '';
  let count = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + count * lh);
      line = word;
      count++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + count * lh);
  return count + 1;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStory(canvas: HTMLCanvasElement, session: Session, bgImg: HTMLImageElement | null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, CW, CH);

  // ── Background ──────────────────────────────────────────────
  if (bgImg) {
    const scale = Math.max(CW / bgImg.naturalWidth, CH / bgImg.naturalHeight);
    const sw = bgImg.naturalWidth * scale;
    const sh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (CW - sw) / 2, (CH - sh) / 2, sw, sh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, CW * 0.3, CH);
    grad.addColorStop(0, '#06172d');
    grad.addColorStop(0.5, '#073352');
    grad.addColorStop(1, '#041220');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
    // decorative arcs
    ctx.strokeStyle = 'rgba(56,189,248,0.06)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(CW * 0.85, CH * 0.22 + i * 260, 320 + i * 80, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ── Dark vignette / gradient overlay ────────────────────────
  const ov = ctx.createLinearGradient(0, 0, 0, CH);
  if (bgImg) {
    ov.addColorStop(0, 'rgba(0,0,0,0.45)');
    ov.addColorStop(0.38, 'rgba(0,0,0,0.25)');
    ov.addColorStop(0.6, 'rgba(0,0,0,0.55)');
    ov.addColorStop(1, 'rgba(0,0,0,0.92)');
  } else {
    ov.addColorStop(0, 'rgba(0,0,0,0)');
    ov.addColorStop(0.55, 'rgba(0,0,0,0.1)');
    ov.addColorStop(1, 'rgba(0,0,0,0.7)');
  }
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, CW, CH);

  // ── Brand header ─────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, CW, 188);
  ctx.textAlign = 'center';
  ctx.font = 'bold 62px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText('WindFlowRadar', CW / 2, 118);
  // accent line
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(CW / 2 - 130, 142, 260, 7);

  // ── Location name ────────────────────────────────────────────
  const locStartY = bgImg ? 740 : 480;
  ctx.font = 'bold 90px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 24;
  const locLines = wrapText(
    ctx,
    session.location_name || 'Sin ubicación',
    CW / 2,
    locStartY,
    CW - 140,
    106,
  );
  ctx.shadowBlur = 0;

  // ── Date + time ──────────────────────────────────────────────
  let ty = locStartY + locLines * 106 + 52;
  ctx.font = '54px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgba(190,225,255,0.92)';
  ctx.fillText(humanDate(session.session_date), CW / 2, ty);
  ty += 76;
  ctx.font = '50px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.fillText(`${session.start_time} – ${session.end_time}`, CW / 2, ty);
  ty += 110;

  // ── Stats card ───────────────────────────────────────────────
  const stats = getStats(session);
  const cardX = 64;
  const cardW = CW - 128;
  const rowH = 116;

  const rows: [string, string, string?][] = [];
  if (stats) {
    rows.push(['💨', `${stats.windAvg} kn`, `ráf. ${stats.gustMax} kn`]);
    rows.push([dirArrow(stats.dirAvg), stats.dirShort, `${stats.dirAvg}°`]);
    if (stats.waveAvg !== null) rows.push(['🌊', `${stats.waveAvg.toFixed(1)} m`, 'altura olas']);
  } else {
    rows.push(['💨', '—', ''], ['🌊', '—', '']);
  }
  rows.push(['⏱', `${session.start_time} – ${session.end_time}`]);

  const cardH = rows.length * rowH + 88;

  ctx.fillStyle = 'rgba(4,22,45,0.78)';
  roundRect(ctx, cardX, ty, cardW, cardH, 52);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56,189,248,0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, cardX, ty, cardW, cardH, 52);
  ctx.stroke();

  ctx.textAlign = 'left';
  rows.forEach(([icon, val, sub], i) => {
    const ry = ty + 82 + i * rowH;
    ctx.font = 'bold 64px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, cardX + 54, ry);
    ctx.font = 'bold 62px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = '#ddf0ff';
    ctx.fillText(val, cardX + 168, ry);
    if (sub) {
      ctx.font = '46px system-ui,-apple-system,sans-serif';
      ctx.fillStyle = 'rgba(155,205,245,0.72)';
      ctx.fillText(sub, cardX + 570, ry);
    }
  });

  ty += cardH + 62;

  // ── Materials ────────────────────────────────────────────────
  const mats = [session.material_1, session.material_2, session.material_3, session.material_4]
    .filter(Boolean)
    .join(' · ');
  if (mats) {
    ctx.textAlign = 'center';
    ctx.font = '46px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = 'rgba(200,230,255,0.82)';
    wrapText(ctx, `🏄  ${mats}`, CW / 2, ty, CW - 140, 60);
    ty += 70;
  }

  // ── Notes (only if space remains) ────────────────────────────
  if (session.notes && ty < CH - 240) {
    ctx.textAlign = 'center';
    ctx.font = 'italic 40px Georgia,serif';
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    wrapText(ctx, `"${session.notes}"`, CW / 2, Math.min(ty + 20, CH - 240), CW - 200, 54);
  }

  // ── Footer brand ─────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.font = '34px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillText('windflowradar.app', CW / 2, CH - 58);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SessionStoryShare({ session, materialPhotos, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgBlobUrl, setBgBlobUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const matEntries = Object.entries(materialPhotos);

  useEffect(() => {
    if (!session || !canvasRef.current) return;
    drawStory(canvasRef.current, session, bgImg);
  }, [session, bgImg]);

  // revoke blob url on unmount or change
  useEffect(() => {
    return () => { if (bgBlobUrl) URL.revokeObjectURL(bgBlobUrl); };
  }, [bgBlobUrl]);

  const applyBlobUrl = useCallback(
    async (url: string) => {
      if (bgBlobUrl) URL.revokeObjectURL(bgBlobUrl);
      setBgBlobUrl(url);
      try {
        const img = await loadImage(url);
        setBgImg(img);
      } catch {
        toast.error('No se pudo cargar la imagen');
        URL.revokeObjectURL(url);
        setBgBlobUrl(null);
      }
    },
    [bgBlobUrl],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 20 * 1024 * 1024) { toast.error('Imagen demasiado grande (máx 20 MB)'); return; }
      applyBlobUrl(URL.createObjectURL(file));
    },
    [applyBlobUrl],
  );

  const handleMatPhoto = useCallback(
    async (photoUrl: string) => {
      const url = await fetchAsBlobUrl(photoUrl);
      if (!url) { toast.error('No se pudo cargar la foto del material'); return; }
      applyBlobUrl(url);
    },
    [applyBlobUrl],
  );

  const clearBg = useCallback(() => {
    if (bgBlobUrl) URL.revokeObjectURL(bgBlobUrl);
    setBgBlobUrl(null);
    setBgImg(null);
  }, [bgBlobUrl]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !session) return;
    setSharing(true);
    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) { toast.error('Error generando la imagen'); return; }
      const fileName = `sesion-windradar-${session.session_date}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Mi sesión – ${session.location_name ?? 'WindFlowRadar'}` });
      } else {
        // desktop fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Imagen descargada. Ábrela desde tu galería y compártela como historia en Instagram.');
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        toast.error('Error al compartir');
      }
    } finally {
      setSharing(false);
    }
  }, [session]);

  if (!session) return null;

  return (
    <Dialog open={!!session} onOpenChange={open => { if (!open) { clearBg(); onClose(); } }}>
      <DialogContent className="max-h-[95dvh] w-full max-w-sm overflow-y-auto border-border bg-card p-4">
        <DialogTitle className="text-sm font-bold">Compartir historia</DialogTitle>

        {/* Story preview */}
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: 270 }}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="w-full rounded-xl shadow-lg"
            style={{ display: 'block', height: 'auto' }}
          />
          {bgImg && (
            <button
              onClick={clearBg}
              title="Quitar foto de fondo"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Background photo controls */}
        <div className="space-y-2.5">
          <p className="text-[0.63rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Foto de fondo
          </p>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2.5 text-sm hover:bg-secondary/70">
            <ImagePlus size={15} />
            <span>Subir foto (cámara o galería)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>

          {matEntries.length > 0 && (
            <div>
              <p className="mb-1.5 text-[0.6rem] text-muted-foreground">
                O usa una foto de tu material:
              </p>
              <div className="flex flex-wrap gap-2">
                {matEntries.map(([name, url]) => (
                  <button
                    key={name}
                    onClick={() => handleMatPhoto(url)}
                    title={name}
                    className="overflow-hidden rounded-md border-2 border-transparent transition-colors hover:border-primary focus:outline-none"
                  >
                    <img
                      src={url}
                      alt={name}
                      className="h-12 w-12 object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Share / download button */}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-4 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50"
        >
          {sharing ? (
            <span>Generando imagen…</span>
          ) : (
            <>
              <InstagramIcon />
              Compartir en Instagram
            </>
          )}
        </button>

        <p className="text-center text-[0.6rem] text-muted-foreground">
          En móvil se abre el menú de compartir directamente.
          <br />
          En escritorio se descarga la imagen para compartir desde la app.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
