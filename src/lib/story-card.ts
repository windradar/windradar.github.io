// Tarjeta de historia (1080×1920) para compartir una sesión.
// Tres plantillas (franja, foto, ficha) que comparten campos, posición y alineación.
import QRCode from 'qrcode';
import { humanDate, dirArrow, windInfo } from '@/lib/weather-helpers';
import type { Session, Snapshot } from '@/lib/session-stats';

export const CW = 1080;
export const CH = 1920;

export type StoryTemplate = 'franja' | 'foto' | 'ficha';
export type StoryField =
  | 'loc' | 'date' | 'time' | 'sport'
  | 'wind' | 'gust' | 'dir' | 'wave' | 'temp' | 'dur'
  | 'chart' | 'mats' | 'notes' | 'qr';
export type StoryPos = 'top' | 'mid' | 'bottom';
export type StoryAlign = 'left' | 'center';

export interface StoryPrefs {
  template: StoryTemplate;
  fields: Record<StoryField, boolean>;
  pos: StoryPos;
  align: StoryAlign;
}

export const STORY_TEMPLATES: StoryTemplate[] = ['franja', 'foto', 'ficha'];
export const STORY_FIELDS: StoryField[] = [
  'loc', 'date', 'time', 'sport', 'wind', 'gust', 'dir', 'wave', 'temp', 'dur', 'chart', 'mats', 'notes', 'qr',
];

export const DEFAULT_STORY_PREFS: StoryPrefs = {
  template: 'franja',
  fields: {
    loc: true, date: true, time: true, sport: true,
    wind: true, gust: true, dir: true, wave: true, temp: false, dur: true,
    chart: true, mats: true, notes: true, qr: false,
  },
  pos: 'bottom',
  align: 'left',
};

const PREFS_KEY = 'windradar.storyCard.v1';

export function loadStoryPrefs(): StoryPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_STORY_PREFS;
    const p = JSON.parse(raw) as Partial<StoryPrefs>;
    return {
      template: STORY_TEMPLATES.includes(p.template as StoryTemplate) ? p.template! : DEFAULT_STORY_PREFS.template,
      fields: { ...DEFAULT_STORY_PREFS.fields, ...(p.fields ?? {}) },
      pos: p.pos === 'top' || p.pos === 'mid' || p.pos === 'bottom' ? p.pos : DEFAULT_STORY_PREFS.pos,
      align: p.align === 'center' ? 'center' : 'left',
    };
  } catch {
    return DEFAULT_STORY_PREFS;
  }
}

export function saveStoryPrefs(prefs: StoryPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
}

// ── Datos de la sesión ───────────────────────────────────────────────────────

export function getStats(session: Session) {
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
  const temps = snap.map(h => h.temp).filter((v): v is number => v !== null);
  const tempAvg = temps.length ? Math.round(temps.reduce((s, v) => s + v, 0) / temps.length) : null;
  return { windAvg, gustMax, dirAvg, dirShort, waveAvg, tempAvg };
}

function durationLabel(start: string, end: string): string | null {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (!(mins > 0)) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const fmt1 = (v: number) => v.toFixed(1).replace('.', ',');

interface CardData {
  loc: string | null;
  date: string | null;
  dateShort: string | null;
  time: string | null;
  sport: string | null;
  wind: number | null;
  gust: number | null;
  dir: { arrow: string; short: string } | null;
  wave: number | null;
  temp: number | null;
  dur: string | null;
  chart: Snapshot[] | null;
  mats: string[];
  notes: string | null;
  qr: string | null;
}

function buildData(session: Session, f: Record<StoryField, boolean>): CardData {
  const st = getStats(session);
  const snap = (session.weather_snapshot as Snapshot[]) ?? [];
  const d = new Date(session.session_date + 'T12:00:00');
  const mats = session.materials.map(m => m.name).filter(Boolean);
  return {
    loc: f.loc ? (session.location_name || 'Sin ubicación') : null,
    date: f.date ? humanDate(session.session_date) : null,
    dateShort: f.date ? d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : null,
    time: f.time ? `${session.start_time} – ${session.end_time}` : null,
    sport: f.sport ? session.sport_name : null,
    wind: f.wind && st ? st.windAvg : null,
    gust: f.gust && st ? st.gustMax : null,
    dir: f.dir && st ? { arrow: dirArrow(st.dirAvg), short: st.dirShort } : null,
    wave: f.wave && st ? st.waveAvg : null,
    temp: f.temp && st ? st.tempAvg : null,
    dur: f.dur ? durationLabel(session.start_time, session.end_time) : null,
    chart: f.chart && snap.length >= 2 ? snap : null,
    mats: f.mats ? mats : [],
    notes: f.notes && session.notes ? session.notes : null,
    qr: f.qr && session.tracking_url ? session.tracking_url : null,
  };
}

// ── Carga de imágenes ────────────────────────────────────────────────────────

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Descarga la imagen como blob para que el canvas no quede "contaminado" por CORS. */
export async function fetchAsBlobUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Carga las fotos del material (nombre → URL) como imágenes listas para el canvas. */
export async function loadMaterialImages(photos: Record<string, string>): Promise<Record<string, HTMLImageElement>> {
  const loaded: Record<string, HTMLImageElement> = {};
  await Promise.all(
    Object.entries(photos).map(async ([name, url]) => {
      const blobUrl = await fetchAsBlobUrl(url);
      if (blobUrl) {
        try { loaded[name] = await loadImage(blobUrl); } catch { /* skip */ }
      }
    }),
  );
  return loaded;
}

// ── Utilidades de dibujo ─────────────────────────────────────────────────────

const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
const GREEN = 'rgb(0, 255, 34)';
const font = (px: number, weight = '', family = FONT) => `${weight ? weight + ' ' : ''}${Math.round(px)}px ${family}`;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

/** Reduce el tamaño de letra hasta que el texto quepa en maxW; devuelve el tamaño usado. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, px: number, maxW: number, weight = '', min = 18): number {
  let s = px;
  ctx.font = font(s, weight);
  while (s > min && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = font(s, weight); }
  return s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function drawBackground(ctx: CanvasRenderingContext2D, bgImg: HTMLImageElement | null) {
  if (bgImg) {
    const scale = Math.max(CW / bgImg.naturalWidth, CH / bgImg.naturalHeight);
    const sw = bgImg.naturalWidth * scale;
    const sh = bgImg.naturalHeight * scale;
    ctx.drawImage(bgImg, (CW - sw) / 2, (CH - sh) / 2, sw, sh);
    return;
  }
  const grad = ctx.createLinearGradient(0, 0, CW, CH);
  grad.addColorStop(0, '#010c1a');
  grad.addColorStop(0.5, '#041622');
  grad.addColorStop(1, '#010a12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);
  ctx.strokeStyle = 'rgba(0,200,255,0.04)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < CW; gx += 90) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH); ctx.stroke(); }
  for (let gy = 0; gy < CH; gy += 90) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,200,255,0.07)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(CW, CH * 0.4 + i * 270, 280 + i * 90, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
}

/** Oscurece la foto donde van los datos para que el texto se lea. */
function drawOverlay(ctx: CanvasRenderingContext2D, hasPhoto: boolean, pos: StoryPos, light = false) {
  const ov = ctx.createLinearGradient(0, 0, 0, CH);
  if (!hasPhoto) {
    ov.addColorStop(0, 'rgba(0,0,0,0)');
    ov.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    ov.addColorStop(1, 'rgba(0,0,0,0.58)');
  } else if (light) {
    ov.addColorStop(0, 'rgba(0,8,18,0.50)');
    ov.addColorStop(0.3, 'rgba(0,8,18,0.12)');
    ov.addColorStop(1, 'rgba(0,8,18,0.45)');
  } else if (pos === 'top') {
    ov.addColorStop(0, 'rgba(0,8,18,0.94)');
    ov.addColorStop(0.55, 'rgba(0,8,18,0.40)');
    ov.addColorStop(1, 'rgba(0,8,18,0.65)');
  } else if (pos === 'mid') {
    ov.addColorStop(0, 'rgba(0,8,18,0.60)');
    ov.addColorStop(0.5, 'rgba(0,8,18,0.72)');
    ov.addColorStop(1, 'rgba(0,8,18,0.80)');
  } else {
    ov.addColorStop(0, 'rgba(0,8,18,0.65)');
    ov.addColorStop(0.30, 'rgba(0,8,18,0.14)');
    ov.addColorStop(0.55, 'rgba(0,8,18,0.38)');
    ov.addColorStop(1, 'rgba(0,8,18,0.97)');
  }
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, CW, CH);
}

function drawChart(ctx: CanvasRenderingContext2D, snap: Snapshot[], x: number, y: number, w: number, h: number, axis: boolean) {
  const padL = axis ? 56 : 0;
  const padB = axis ? 40 : 0;
  const top = y + 10;
  const max = Math.max(10, Math.ceil(Math.max(...snap.map(p => p.gust_kn)) / 10) * 10);
  const px = (i: number) => x + padL + (i * (w - padL)) / (snap.length - 1);
  const py = (v: number) => top + (1 - v / max) * (h - padB - 10);

  if (axis) {
    ctx.font = font(26);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textBaseline = 'middle';
    for (let v = 10; v <= max; v += 10) {
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + padL, py(v)); ctx.lineTo(x + w, py(v)); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(v), x + padL - 12, py(v));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const step = Math.max(1, Math.ceil(snap.length / 5));
    snap.forEach((p, i) => { if (i % step === 0) ctx.fillText(p.hour.slice(0, 2) + 'h', px(i), y + h - 4); });
  }

  // área de viento medio
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  snap.forEach((p, i) => ctx.lineTo(px(i), py(p.wind_kn)));
  ctx.lineTo(px(snap.length - 1), py(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,255,34,0.16)';
  ctx.fill();

  // racha, discontinua
  ctx.setLineDash([12, 9]);
  ctx.strokeStyle = 'rgba(60,200,240,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  snap.forEach((p, i) => (i ? ctx.lineTo(px(i), py(p.gust_kn)) : ctx.moveTo(px(i), py(p.gust_kn))));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  snap.forEach((p, i) => (i ? ctx.lineTo(px(i), py(p.wind_kn)) : ctx.moveTo(px(i), py(p.wind_kn))));
  ctx.stroke();

  const iMax = snap.reduce((b, p, i) => (p.wind_kn > snap[b].wind_kn ? i : b), 0);
  ctx.fillStyle = GREEN;
  ctx.beginPath(); ctx.arc(px(iMax), py(snap[iMax].wind_kn), 10, 0, Math.PI * 2); ctx.fill();
}

function drawQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
  try {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const pad = size * 0.06;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, size, size, size * 0.08);
    ctx.fill();
    const cell = (size - pad * 2) / n;
    ctx.fillStyle = '#06121c';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
    ctx.font = font(24);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('tracking', x + size / 2, y + size + 32);
  } catch { /* URL no codificable: sin QR */ }
}

function drawThumb(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) {
  const r = size * 0.17;
  ctx.save();
  roundRect(ctx, x, y, size, size, r);
  ctx.clip();
  const sc = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * sc;
  const h = img.naturalHeight * sc;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,255,34,0.55)';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, size, size, r);
  ctx.stroke();
}

/**
 * Bloque apilable: cada elemento sabe medirse y pintarse a una escala dada.
 * Se mide a escala 1; si no cabe en la zona se reduce la escala hasta que quepa.
 */
interface Item {
  h: (s: number) => number;
  draw: (y: number, s: number) => void;
}

function stackHeight(items: Item[], s: number, gap: number) {
  return items.reduce((t, it) => t + it.h(s), 0) + Math.max(0, items.length - 1) * gap * s;
}

function placeStack(items: Item[], zoneTop: number, zoneBottom: number, pos: StoryPos, gap: number, minScale = 0.5) {
  const avail = zoneBottom - zoneTop;
  const h1 = stackHeight(items, 1, gap);
  const s = h1 > avail ? Math.max(minScale, avail / h1) : 1;
  const h = stackHeight(items, s, gap);
  let y = pos === 'top' ? zoneTop : pos === 'mid' ? zoneTop + (avail - h) / 2 : zoneBottom - h;
  for (const it of items) {
    it.draw(y, s);
    y += it.h(s) + gap * s;
  }
}

interface Ctx {
  ctx: CanvasRenderingContext2D;
  d: CardData;
  prefs: StoryPrefs;
  matImgs: Record<string, HTMLImageElement>;
}

/** Líneas de texto con salto automático, alineadas a izquierda o centro. */
function textItem(c: Ctx, text: string, x: number, w: number, px: number, lh: number, color: string, weight = '', family = FONT): Item {
  const lines = (s: number) => { c.ctx.font = font(px * s, weight, family); return wrapLines(c.ctx, text, w); };
  return {
    h: s => lines(s).length * lh * s,
    draw: (y, s) => {
      const ls = lines(s);
      const { ctx } = c;
      ctx.fillStyle = color;
      ctx.textBaseline = 'alphabetic';
      const center = c.prefs.align === 'center';
      ctx.textAlign = center ? 'center' : 'left';
      ls.forEach((l, i) => ctx.fillText(l, center ? x + w / 2 : x, y + (i + 0.78) * lh * s));
    },
  };
}

function labelItem(c: Ctx, text: string, x: number, w: number, px = 32): Item {
  return textItem(c, text, x, w, px, px * 1.4, GREEN);
}

function materialsItem(c: Ctx, x: number, w: number, textPx: number, thumb: number): Item {
  const { ctx, d, matImgs } = c;
  const rowH = (m: string, s: number) => {
    if (matImgs[m]) return thumb * s;
    ctx.font = font(textPx * s);
    return wrapLines(ctx, m, w).length * textPx * 1.2 * s;
  };
  const gap = 18;
  return {
    h: s => d.mats.reduce((t, m) => t + rowH(m, s), 0) + (d.mats.length - 1) * gap * s,
    draw: (y, s) => {
      const center = c.prefs.align === 'center';
      for (const m of d.mats) {
        const img = matImgs[m];
        ctx.font = font(textPx * s);
        ctx.fillStyle = 'rgba(210,235,255,0.90)';
        if (img) {
          const t = thumb * s;
          const tw = ctx.measureText(m).width;
          const total = Math.min(w, t + 24 * s + tw);
          const x0 = center ? x + (w - total) / 2 : x;
          drawThumb(ctx, img, x0, y, t);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(m, x0 + t + 24 * s, y + t / 2, w - t - 24 * s);
          ctx.textBaseline = 'alphabetic';
        } else {
          ctx.textAlign = center ? 'center' : 'left';
          wrapLines(ctx, m, w).forEach((l, i) => ctx.fillText(l, center ? x + w / 2 : x, y + (i + 0.8) * textPx * 1.2 * s));
        }
        y += rowH(m, s) + gap * s;
      }
    },
  };
}

function chartItem(c: Ctx, x: number, w: number, h: number, axis: boolean): Item {
  return { h: s => h * s, draw: (y, s) => drawChart(c.ctx, c.d.chart!, x, y, w, h * s, axis) };
}

// ── Plantilla 1 · Franja ─────────────────────────────────────────────────────

function drawFranja(c: Ctx, hasPhoto: boolean) {
  const { ctx, d, prefs } = c;
  drawOverlay(ctx, hasPhoto, prefs.pos);

  const STRIP = 140;
  const MX = STRIP + 60;
  const MW = CW - MX - 64;

  const sg = ctx.createLinearGradient(0, 80, 0, CH - 80);
  sg.addColorStop(0, 'rgba(0,200,255,0)');
  sg.addColorStop(0.1, 'rgba(0,200,255,0.38)');
  sg.addColorStop(0.9, 'rgba(0,200,255,0.38)');
  sg.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.strokeStyle = sg;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(STRIP, 80); ctx.lineTo(STRIP, CH - 80); ctx.stroke();

  // Lugar en vertical, de abajo arriba
  if (d.loc) {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    fitFont(ctx, d.loc, 88, CH - 280, 'bold', 30);
    ctx.translate(STRIP / 2, CH - 130);
    ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = 'rgba(0,200,255,0.55)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(d.loc, 0, 0);
    ctx.restore();
  }

  const center = prefs.align === 'center';
  const tx = center ? MX + MW / 2 : MX;
  ctx.textAlign = center ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(54, 'bold');
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.fillText('WindFlowRadar', tx, 190);
  ctx.fillStyle = GREEN;
  ctx.fillRect(center ? tx - 109 : MX, 207, 218, 4);

  // Cabecera: deporte, fecha y horario
  let hy = 211;
  if (d.sport) {
    hy += 76;
    ctx.font = font(34, '600');
    ctx.fillStyle = 'rgba(220,240,255,0.70)';
    ctx.fillText(d.sport.toUpperCase(), tx, hy);
  }
  if (d.date) {
    hy += d.sport ? 66 : 86;
    ctx.font = font(50);
    ctx.fillStyle = GREEN;
    ctx.fillText(d.date, tx, hy);
  }
  if (d.time) {
    hy += 60;
    ctx.font = font(44);
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.fillText(d.time, tx, hy);
  }
  const zoneTop = hy + 70;

  // Pie: web y QR
  ctx.textAlign = 'left';
  ctx.font = font(32);
  ctx.fillStyle = GREEN;
  ctx.fillText('windradar.github.io', MX, CH - 55);
  const QR = 190;
  if (d.qr) drawQr(ctx, d.qr, CW - 64 - QR, CH - 55 - 32 - QR, QR);
  const zoneBottom = CH - 55 - (d.qr ? QR + 32 + 50 : 80);

  // Filas de datos: con 5 o más se reparten en dos columnas para no encoger tanto
  const rows: [string, string][] = [];
  if (d.wind !== null) rows.push(['💨', `${d.wind} kn`]);
  if (d.gust !== null) rows.push(['⚡', `ráf. ${d.gust} kn`]);
  if (d.dir) rows.push([d.dir.arrow, d.dir.short]);
  if (d.wave !== null) rows.push(['🌊', `${fmt1(d.wave)} m`]);
  if (d.temp !== null) rows.push(['🌡️', `${d.temp} °C`]);
  if (d.dur) rows.push(['⏱', d.dur]);

  const items: Item[] = [];
  if (rows.length) {
    const cols = rows.length >= 5 ? 2 : 1;
    const perCol = Math.ceil(rows.length / cols);
    const ROW_H = 112;
    const colW = (MW - (cols - 1) * 40) / cols;
    items.push({
      h: s => perCol * ROW_H * s + 4,
      draw: (y, s) => {
        ctx.strokeStyle = 'rgba(0,255,34,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(MX, y); ctx.lineTo(MX + MW, y); ctx.stroke();
        rows.forEach(([icon, val], i) => {
          const col = cols === 2 ? Math.floor(i / perCol) : 0;
          const row = cols === 2 ? i % perCol : i;
          const cx = MX + col * (colW + 40);
          const base = y + (row + 0.66) * ROW_H * s;
          const iconW = (cols === 2 ? 90 : 120) * s;
          const px = fitFont(ctx, val, 60 * s, colW - iconW, 'bold', 24);
          ctx.font = font(px, 'bold');
          const total = iconW + ctx.measureText(val).width;
          const x0 = center ? cx + (colW - total) / 2 : cx;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = font(px, 'bold');
          ctx.fillText(icon, x0, base);
          ctx.fillStyle = 'rgba(220,240,255,0.92)';
          ctx.fillText(val, x0 + iconW, base);
          const ruleY = y + (row + 1) * ROW_H * s;
          const last = row === perCol - 1;
          ctx.strokeStyle = last ? 'rgba(0,255,34,0.55)' : 'rgba(0,255,34,0.20)';
          ctx.lineWidth = last ? 2 : 1;
          ctx.beginPath(); ctx.moveTo(cx, ruleY); ctx.lineTo(cx + colW, ruleY); ctx.stroke();
        });
      },
    });
  }
  if (d.chart) {
    items.push(labelItem(c, 'VIENTO DURANTE LA SESIÓN', MX, MW));
    items.push(chartItem(c, MX, MW, 200, false));
  }
  if (d.mats.length) {
    items.push(labelItem(c, 'EQUIPO', MX, MW));
    items.push(materialsItem(c, MX, MW, 46, 96));
  }
  if (d.notes) {
    items.push(labelItem(c, 'NOTAS', MX, MW));
    items.push(textItem(c, d.notes, MX, MW, 42, 56, 'rgba(255,255,255,0.58)', 'italic', 'Georgia,serif'));
  }
  placeStack(items, zoneTop, zoneBottom, prefs.pos, 30);
}

// ── Plantilla 2 · Foto ───────────────────────────────────────────────────────

function drawFoto(c: Ctx, hasPhoto: boolean) {
  const { ctx, d, prefs } = c;
  drawOverlay(ctx, hasPhoto, prefs.pos);
  const PAD = 76;
  const W = CW - PAD * 2;
  const center = prefs.align === 'center';

  // Cabecera: marca y deporte
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = font(38, '600');
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('WindFlowRadar', PAD, PAD + 40);
  if (d.sport) {
    const label = d.sport.toUpperCase();
    ctx.font = font(30, '600');
    const tw = ctx.measureText(label).width + 52;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    roundRect(ctx, CW - PAD - tw, PAD, tw, 56, 28);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(label, CW - PAD - tw / 2, PAD + 39);
  }

  // Pie
  ctx.textAlign = 'left';
  ctx.font = font(32);
  ctx.fillStyle = GREEN;
  ctx.fillText('windradar.github.io', PAD, CH - 70);
  const QR = 170;
  if (d.qr) drawQr(ctx, d.qr, CW - PAD - QR, CH - 70 - 32 - QR, QR);

  const zoneTop = PAD + 120;
  const zoneBottom = CH - 70 - (d.qr ? QR + 32 + 50 : 80);
  const items: Item[] = [];

  if (d.loc) items.push(textItem(c, d.loc, PAD, W, 104, 110, '#ffffff', '800'));
  const dateLine = [d.dateShort, d.time].filter(Boolean).join(' · ');
  if (dateLine) items.push(textItem(c, dateLine, PAD, W, 44, 58, 'rgba(255,255,255,0.78)'));

  if (d.wind !== null) {
    const num = String(d.wind);
    items.push({
      h: s => 250 * s,
      draw: (y, s) => {
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.font = font(270 * s, '800');
        const nw = ctx.measureText(num).width;
        ctx.font = font(76 * s, 'bold');
        const uw = ctx.measureText('kn').width;
        const total = nw + 22 * s + uw;
        const x0 = center ? PAD + (W - total) / 2 : PAD;
        const base = y + 225 * s;
        ctx.shadowColor = 'rgba(0,255,34,0.35)';
        ctx.shadowBlur = 50 * s;
        ctx.fillStyle = GREEN;
        ctx.font = font(270 * s, '800');
        ctx.fillText(num, x0, base);
        ctx.shadowBlur = 0;
        ctx.font = font(76 * s, 'bold');
        ctx.fillText('kn', x0 + nw + 22 * s, base);
      },
    });
  }

  // Datos secundarios en línea, con etiqueta tenue
  const facts: [string, string][] = [];
  if (d.gust !== null) facts.push(['ráf.', `${d.gust} kn`]);
  if (d.dir) facts.push(['dir.', `${d.dir.arrow} ${d.dir.short}`]);
  if (d.wave !== null) facts.push(['olas', `${fmt1(d.wave)} m`]);
  if (d.temp !== null) facts.push(['temp.', `${d.temp} °C`]);
  if (d.dur) facts.push(['tiempo', d.dur]);
  if (facts.length) {
    const layout = (s: number) => {
      const lines: { k: string; v: string; w: number }[][] = [[]];
      let lw = 0;
      for (const [k, v] of facts) {
        ctx.font = font(46 * s);
        const kw = ctx.measureText(k + ' ').width;
        ctx.font = font(46 * s, '600');
        const w = kw + ctx.measureText(v).width;
        const gap = lines[lines.length - 1].length ? 44 * s : 0;
        if (lw + gap + w > W && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
        lw += (lines[lines.length - 1].length ? 44 * s : 0) + w;
        lines[lines.length - 1].push({ k, v, w });
      }
      return lines;
    };
    items.push({
      h: s => layout(s).length * 64 * s,
      draw: (y, s) => {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        layout(s).forEach((line, li) => {
          const total = line.reduce((t, f) => t + f.w, 0) + (line.length - 1) * 44 * s;
          let x = center ? PAD + (W - total) / 2 : PAD;
          const base = y + (li + 0.78) * 64 * s;
          for (const f of line) {
            ctx.font = font(46 * s);
            ctx.fillStyle = 'rgba(255,255,255,0.62)';
            ctx.fillText(f.k + ' ', x, base);
            const kw = ctx.measureText(f.k + ' ').width;
            ctx.font = font(46 * s, '600');
            ctx.fillStyle = '#ffffff';
            ctx.fillText(f.v, x + kw, base);
            x += f.w + 44 * s;
          }
        });
      },
    });
  }
  if (d.chart) items.push(chartItem(c, PAD, W, 170, false));
  if (d.mats.length) items.push(textItem(c, d.mats.join(' · '), PAD, W, 40, 54, 'rgba(255,255,255,0.78)'));
  if (d.notes) items.push(textItem(c, `«${d.notes}»`, PAD, W, 40, 54, 'rgba(255,255,255,0.72)', 'italic', 'Georgia,serif'));

  placeStack(items, zoneTop, zoneBottom, prefs.pos, 26);
}

// ── Plantilla 3 · Ficha ──────────────────────────────────────────────────────

function drawFicha(c: Ctx, hasPhoto: boolean) {
  const { ctx, d, prefs } = c;
  drawOverlay(ctx, hasPhoto, prefs.pos, true);
  const PAD = 65;
  const center = prefs.align === 'center';

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = center ? 'center' : 'left';
  ctx.font = font(54, 'bold');
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.fillText('WindFlowRadar', center ? CW / 2 : PAD, PAD + 70);
  ctx.fillStyle = GREEN;
  ctx.fillRect(center ? CW / 2 - 109 : PAD, PAD + 87, 218, 4);

  ctx.textAlign = center ? 'center' : 'left';
  ctx.font = font(32);
  ctx.fillStyle = GREEN;
  ctx.fillText('windradar.github.io', center ? CW / 2 : PAD, CH - 55);

  // Contenido del panel
  const PX = PAD;
  const PW = CW - PAD * 2;
  const IP = 56; // margen interior
  const IX = PX + IP;
  const IW = PW - IP * 2;
  const inner: Item[] = [];

  // Título: lugar + insignia de deporte
  if (d.loc || d.sport || d.date || d.time) {
    const badge = d.sport ? d.sport.toUpperCase() : null;
    const badgeW = (s: number) => { if (!badge) return 0; ctx.font = font(28 * s, 'bold'); return ctx.measureText(badge).width + 44 * s; };
    const titleW = (s: number) => IW - (badge ? badgeW(s) + 24 * s : 0);
    const locLines = (s: number) => {
      if (!d.loc) return [];
      const w = titleW(s); // antes de fijar la fuente: badgeW la cambia al medir
      ctx.font = font(72 * s, '800');
      return wrapLines(ctx, d.loc, w);
    };
    const dateLine = [d.date, d.time].filter(Boolean).join(' · ');
    inner.push({
      h: s => Math.max(locLines(s).length * 78 * s + (dateLine ? 56 * s : 0), badge ? 56 * s : 0),
      draw: (y, s) => {
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        const ls = locLines(s);
        ctx.font = font(72 * s, '800');
        ctx.fillStyle = '#ffffff';
        ls.forEach((l, i) => ctx.fillText(l, IX, y + (i + 0.8) * 78 * s));
        if (dateLine) {
          ctx.font = font(38 * s);
          ctx.fillStyle = 'rgba(255,255,255,0.62)';
          ctx.fillText(dateLine, IX, y + ls.length * 78 * s + 44 * s, titleW(s));
        }
        if (badge) {
          const bw = badgeW(s);
          ctx.fillStyle = GREEN;
          roundRect(ctx, IX + IW - bw, y + 4 * s, bw, 52 * s, 12 * s);
          ctx.fill();
          ctx.font = font(28 * s, 'bold');
          ctx.fillStyle = '#021006';
          ctx.textAlign = 'center';
          ctx.fillText(badge, IX + IW - bw / 2, y + 40 * s);
        }
      },
    });
  }

  // Cuadrícula de datos, dos columnas
  const cells: [string, string, string][] = [];
  if (d.wind !== null) cells.push(['VIENTO MEDIO', String(d.wind), 'kn']);
  if (d.gust !== null) cells.push(['RACHA MÁX.', String(d.gust), 'kn']);
  if (d.dir) cells.push(['DIRECCIÓN', `${d.dir.arrow} ${d.dir.short}`, '']);
  if (d.wave !== null) cells.push(['OLAS', fmt1(d.wave), 'm']);
  if (d.temp !== null) cells.push(['TEMPERATURA', String(d.temp), '°C']);
  if (d.dur) cells.push(['DURACIÓN', d.dur, '']);
  if (cells.length) {
    const CELL_H = 150;
    const GAP = 22;
    const rowsN = Math.ceil(cells.length / 2);
    inner.push({
      h: s => rowsN * CELL_H * s + (rowsN - 1) * GAP * s,
      draw: (y, s) => {
        const cw = (IW - GAP * s) / 2;
        cells.forEach(([k, v, u], i) => {
          const cx = IX + (i % 2) * (cw + GAP * s);
          const cy = y + Math.floor(i / 2) * (CELL_H + GAP) * s;
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          roundRect(ctx, cx, cy, cw, CELL_H * s, 24 * s);
          ctx.fill();
          const tx = center ? cx + cw / 2 : cx + 32 * s;
          ctx.textAlign = center ? 'center' : 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.font = font(26 * s, '600');
          ctx.fillStyle = 'rgba(160,200,225,0.85)';
          ctx.fillText(k, tx, cy + 50 * s);
          const vpx = fitFont(ctx, v + (u ? ' ' + u : ''), 64 * s, cw - 64 * s, '800', 24);
          ctx.font = font(vpx, '800');
          const vw = ctx.measureText(v).width;
          ctx.font = font(vpx * 0.55, '600');
          const uw = u ? ctx.measureText(u).width + 8 * s : 0;
          const x0 = center ? cx + (cw - vw - uw) / 2 : cx + 32 * s;
          ctx.textAlign = 'left';
          ctx.font = font(vpx, '800');
          ctx.fillStyle = '#ffffff';
          ctx.fillText(v, x0, cy + 122 * s);
          if (u) {
            ctx.font = font(vpx * 0.55, '600');
            ctx.fillStyle = 'rgba(255,255,255,0.62)';
            ctx.fillText(u, x0 + vw + 8 * s, cy + 122 * s);
          }
        });
      },
    });
  }

  if (d.chart) {
    inner.push(labelItem(c, 'VIENTO · NUDOS', IX, IW, 28));
    inner.push(chartItem(c, IX, IW, 250, true));
  }

  // Equipo y notas a la izquierda, QR a la derecha
  const QR = 180;
  const leftW = d.qr ? IW - QR - 40 : IW;
  const foot: Item[] = [];
  if (d.mats.length) {
    foot.push(labelItem(c, 'EQUIPO', IX, leftW, 28));
    foot.push(materialsItem(c, IX, leftW, 40, 84));
  }
  if (d.notes) foot.push(textItem(c, d.notes, IX, leftW, 36, 50, 'rgba(255,255,255,0.68)', 'italic', 'Georgia,serif'));
  if (foot.length || d.qr) {
    inner.push({
      h: s => Math.max(stackHeight(foot, s, 20), d.qr ? (QR + 40) * s : 0),
      draw: (y, s) => {
        let fy = y;
        for (const it of foot) { it.draw(fy, s); fy += it.h(s) + 20 * s; }
        if (d.qr) drawQr(ctx, d.qr, IX + IW - QR * s, y, QR * s);
      },
    });
  }

  if (!inner.length) return;
  const GAP = 36;
  const panel: Item = {
    h: s => stackHeight(inner, s, GAP) + IP * 2,
    draw: (y, s) => {
      const h = stackHeight(inner, s, GAP) + IP * 2;
      ctx.fillStyle = 'rgba(4,14,24,0.74)';
      roundRect(ctx, PX, y, PW, h, 44);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,200,255,0.28)';
      ctx.lineWidth = 3;
      roundRect(ctx, PX, y, PW, h, 44);
      ctx.stroke();
      let iy = y + IP;
      for (const it of inner) { it.draw(iy, s); iy += it.h(s) + GAP * s; }
    },
  };
  placeStack([panel], PAD + 150, CH - 55 - 80, prefs.pos, 0);
}

// ── Punto de entrada ─────────────────────────────────────────────────────────

export function drawStory(
  canvas: HTMLCanvasElement,
  session: Session,
  prefs: StoryPrefs,
  bgImg: HTMLImageElement | null,
  matImgs: Record<string, HTMLImageElement>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, CW, CH);
  drawBackground(ctx, bgImg);

  const c: Ctx = { ctx, d: buildData(session, prefs.fields), prefs, matImgs };
  if (prefs.template === 'foto') drawFoto(c, !!bgImg);
  else if (prefs.template === 'ficha') drawFicha(c, !!bgImg);
  else drawFranja(c, !!bgImg);
}

/** Sesión de ejemplo para previsualizar cuando el usuario aún no tiene ninguna. */
export const SAMPLE_SESSION: Session = {
  id: 'sample',
  session_date: '2026-09-18',
  start_time: '12:00',
  end_time: '15:30',
  location_name: 'Tarifa · Los Lances',
  location_lat: 36.02,
  location_lon: -5.62,
  weather_snapshot: [
    { hour: '12:00', wind_kn: 14, gust_kn: 20, dir_deg: 105, dir_short: 'ESE', wave_m: 0.6, temp: 23 },
    { hour: '13:00', wind_kn: 18, gust_kn: 24, dir_deg: 110, dir_short: 'ESE', wave_m: 0.7, temp: 24 },
    { hour: '14:00', wind_kn: 22, gust_kn: 28, dir_deg: 112, dir_short: 'ESE', wave_m: 0.9, temp: 25 },
    { hour: '15:00', wind_kn: 21, gust_kn: 27, dir_deg: 115, dir_short: 'ESE', wave_m: 1.0, temp: 24 },
  ],
  sport_name: 'Windsurf',
  materials: [
    { category_id: 'sail', name: 'Severne Blade 4.7' },
    { category_id: 'board', name: 'Starboard Kode 94' },
  ],
  tracking_url: 'https://windradar.github.io/',
  notes: 'Levante entrando fuerte desde las 14 h. Planeo constante en el pico.',
};
