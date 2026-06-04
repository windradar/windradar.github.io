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

function countLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  let count = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { line = word; count++; }
    else line = test;
  }
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

function drawStory(
  canvas: HTMLCanvasElement,
  session: Session,
  bgImg: HTMLImageElement | null,
  matImgs: Record<string, HTMLImageElement>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, CW, CH);

  // ── Background ──────────────────────────────────────────────
  if (bgImg) {
    const scale = Math.max(CW / bgImg.naturalWidth, CH / bgImg.naturalHeight);
    const sw = bgImg.naturalWidth * scale;
    const sh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (CW - sw) / 2, (CH - sh) / 2, sw, sh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, CW, CH);
    grad.addColorStop(0, '#010c1a');
    grad.addColorStop(0.5, '#041622');
    grad.addColorStop(1, '#010a12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(0,200,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < CW; gx += 90) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH); ctx.stroke();
    }
    for (let gy = 0; gy < CH; gy += 90) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.07)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(CW, CH * 0.4 + i * 270, 280 + i * 90, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ── Overlay gradient ─────────────────────────────────────────
  const ov = ctx.createLinearGradient(0, 0, 0, CH);
  if (bgImg) {
    ov.addColorStop(0,    'rgba(0,8,18,0.65)');
    ov.addColorStop(0.30, 'rgba(0,8,18,0.14)');
    ov.addColorStop(0.55, 'rgba(0,8,18,0.38)');
    ov.addColorStop(1,    'rgba(0,8,18,0.97)');
  } else {
    ov.addColorStop(0, 'rgba(0,0,0,0)');
    ov.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    ov.addColorStop(1, 'rgba(0,0,0,0.58)');
  }
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, CW, CH);

  const STRIP = 140;
  const MX = STRIP + 60;
  const MW = CW - MX - 64;

  // ── Vertical separator line ───────────────────────────────────
  const sg = ctx.createLinearGradient(0, 80, 0, CH - 80);
  sg.addColorStop(0,   'rgba(0,200,255,0)');
  sg.addColorStop(0.1, 'rgba(0,200,255,0.38)');
  sg.addColorStop(0.9, 'rgba(0,200,255,0.38)');
  sg.addColorStop(1,   'rgba(0,200,255,0)');
  ctx.strokeStyle = sg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(STRIP, 80);
  ctx.lineTo(STRIP, CH - 80);
  ctx.stroke();

  // ── Location name — left strip, reads bottom-to-top ──────────
  {
    const loc = session.location_name || 'Sin ubicación';
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let fs = 88;
    do {
      ctx.font = `bold ${fs}px system-ui,-apple-system,sans-serif`;
      if (ctx.measureText(loc).width <= CH - 280) break;
      fs -= 4;
    } while (fs > 30);
    ctx.translate(STRIP / 2, CH - 130);
    ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = 'rgba(0,200,255,0.55)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(loc, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Brand header ─────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = 'bold 54px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.fillText('WindFlowRadar', MX, 285);
  ctx.fillStyle = 'rgb(0, 255, 42)';
  ctx.fillRect(MX, 302, 218, 4);

  // ── Build data first (needed for height measurement) ─────────
  const stats = getStats(session);
  const rows: [string, string][] = [];
  if (stats) {
    rows.push(['💨', `${stats.windAvg} kn  |  ráf. ${stats.gustMax} kn`]);
    rows.push([dirArrow(stats.dirAvg), stats.dirShort]);
    if (stats.waveAvg !== null) rows.push(['🌊', `${stats.waveAvg.toFixed(1)} m`]);
  } else {
    rows.push(['💨', '—'], ['🌊', '—']);
  }
  rows.push(['⏱', `${session.start_time} – ${session.end_time}`]);

  const matList = [session.material_1, session.material_2, session.material_3, session.material_4]
    .filter((m): m is string => !!m);

  const ROW_H = 116;
  const THUMB = 96;
  const THUMB_R = THUMB / 2;
  const THUMB_GAP = 24;

  // ── Date + time — fijos bajo el título ──────────────────────
  ctx.font = '50px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'hsl(128, 100%, 50%)';
  ctx.fillText(humanDate(session.session_date), MX, 370);
  ctx.font = '44px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.fillText(`${session.start_time} – ${session.end_time}`, MX, 430);

  // ── Measure bottom block height ───────────────────────────────
  let blockH = 90 + rows.length * ROW_H + 28 + 20; // stats (gap reducido)
  if (matList.length) {
    blockH += 54;
    for (const mat of matList) {
      if (matImgs[mat]) { blockH += THUMB + 18; }
      else {
        ctx.font = '46px system-ui,-apple-system,sans-serif';
        blockH += countLines(ctx, mat, MW, 54) * 54 + 12;
      }
    }
    blockH += 32;
  }
  if (session.notes) {
    blockH += 54;
    ctx.font = 'italic 42px Georgia,serif';
    blockH += countLines(ctx, session.notes, MW, 56) * 56 + 20;
  }

  // Anchor to bottom
  let ty = (CH - 55) - 80 - blockH;

  // ── Stats rows ────────────────────────────────────────────────
  ctx.strokeStyle = 'hsla(128,100%,50%,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(MX, ty); ctx.lineTo(MX + MW, ty); ctx.stroke();

  rows.forEach(([icon, val], i) => {
    const baseline = ty + 90 + i * ROW_H;

    ctx.textAlign = 'left';
    ctx.font = 'bold 64px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, MX, baseline);

    ctx.font = 'bold 64px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.92)';
    ctx.fillText(val, MX + 132, baseline);

    const ruleY = baseline + 28;
    ctx.strokeStyle = i === rows.length - 1 ? 'hsla(128,100%,50%,0.55)' : 'hsla(128,100%,50%,0.20)';
    ctx.lineWidth = i === rows.length - 1 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(MX, ruleY); ctx.lineTo(MX + MW, ruleY); ctx.stroke();
  });

  ty += 90 + rows.length * ROW_H + 28 + 60;

  // ── Equipo ────────────────────────────────────────────────────
  if (matList.length) {
    ctx.textAlign = 'left';
    ctx.font = '32px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = 'hsl(128,100%,50%)';
    ctx.fillText('EQUIPO', MX, ty);
    ty += 54;

    for (const mat of matList) {
      const img = matImgs[mat];
      if (img) {
        ctx.save();
        roundRect(ctx, MX, ty, THUMB, THUMB, 16);
        ctx.clip();
        ctx.drawImage(img, MX, ty, THUMB, THUMB);
        ctx.restore();
        ctx.strokeStyle = 'hsla(128,100%,50%,0.55)';
        ctx.lineWidth = 3;
        roundRect(ctx, MX, ty, THUMB, THUMB, 16);
        ctx.stroke();
        ctx.font = '46px system-ui,-apple-system,sans-serif';
        ctx.fillStyle = 'rgba(210,235,255,0.90)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(mat, MX + THUMB + THUMB_GAP, ty + THUMB_R);
        ctx.textBaseline = 'alphabetic';
        ty += THUMB + 18;
      } else {
        ctx.font = '46px system-ui,-apple-system,sans-serif';
        ctx.fillStyle = 'rgba(210,235,255,0.90)';
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, mat, MX, ty, MW, 54);
        ty += lines * 54 + 12;
      }
    }
    ty += 32;
  }

  // ── Notas ────────────────────────────────────────────────────
  if (session.notes) {
    ctx.textAlign = 'left';
    ctx.font = '32px system-ui,-apple-system,sans-serif';
    ctx.fillStyle = 'hsl(128,100%,50%)';
    ctx.fillText('NOTAS', MX, ty);
    ty += 54;
    ctx.font = 'italic 42px Georgia,serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    wrapText(ctx, session.notes, MX, ty, MW, 56);
  }

  // ── Footer ───────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = '32px system-ui,-apple-system,sans-serif';
  ctx.fillStyle = 'rgb(0, 255, 0)';
  ctx.fillText('windradar.github.io', MX, CH - 55);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SessionStoryShare({ session, materialPhotos, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgBlobUrl, setBgBlobUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [matImgs, setMatImgs] = useState<Record<string, HTMLImageElement>>({});

  const matEntries = Object.entries(materialPhotos);

  useEffect(() => {
    if (!Object.keys(materialPhotos).length) return;
    let cancelled = false;
    (async () => {
      const loaded: Record<string, HTMLImageElement> = {};
      await Promise.all(
        Object.entries(materialPhotos).map(async ([name, url]) => {
          const blobUrl = await fetchAsBlobUrl(url);
          if (blobUrl && !cancelled) {
            try { loaded[name] = await loadImage(blobUrl); } catch { /* skip */ }
          }
        }),
      );
      if (!cancelled) setMatImgs(loaded);
    })();
    return () => { cancelled = true; };
  }, [materialPhotos]);

  useEffect(() => {
    if (!session || !canvasRef.current) return;
    drawStory(canvasRef.current, session, bgImg, matImgs);
  }, [session, bgImg, matImgs]);

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
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95));
      if (!blob) { toast.error('Error generando la imagen'); return; }
      const fileName = `sesion-windradar-${session.session_date}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

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
