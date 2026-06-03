// Supabase Edge Function — send-forecast-email
// Schedule: every hour at :00 (Europe/Madrid timezone aware)
// Requires env vars: RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET
// Auto-injected by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// TEST MODE: call via fetch with user JWT Authorization header —
// sends immediately to that user only, ignoring time schedule.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM_EMAIL     = Deno.env.get('RESEND_FROM_EMAIL') ?? 'WindFlowRadar <noreply@windflowradar.com>';
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://windradar.github.io',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── helpers ────────────────────────────────────────────────────────────────

function kmhToKn(kmh: number) { return kmh / 1.852; }

function wmoEmoji(code: number) {
  if (code === 0) return '☀️';
  if (code <= 2)  return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 75) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 99) return '⛈️';
  return '☁️';
}

const CARD16 = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
function windDir(deg: number) {
  return CARD16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

function padHour(h: string) { return h.length === 4 ? '0' + h : h; }

function madridHour(date: Date): string {
  const h = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return padHour(h) + ':00';
}

function madridDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// ─── email HTML builder ──────────────────────────────────────────────────────

interface ProfileRow {
  email_notif_address:    string;
  email_notif_location:   string;
  email_notif_lat:        number;
  email_notif_lon:        number;
  email_notif_range_from: string;
  email_notif_range_to:   string;
  email_notif_min_wind:   number;
}

interface WxHourly {
  time:               string[];
  wind_speed_10m:     number[];
  wind_gusts_10m:     number[];
  wind_direction_10m: number[];
  weathercode:        number[];
}

function buildHtml(profile: ProfileRow, hourly: WxHourly, dateLabel: string): string {
  const { email_notif_range_from: from, email_notif_range_to: to, email_notif_min_wind: threshold } = profile;

  const rows = hourly.time
    .map((t, i) => ({ hour: t.slice(11, 16), i }))
    .filter(({ hour }) => hour >= from && hour <= to)
    .map(({ hour, i }) => {
      const ws  = Math.round(kmhToKn(hourly.wind_speed_10m[i] ?? 0));
      const wg  = Math.round(kmhToKn(hourly.wind_gusts_10m[i] ?? 0));
      const wd  = windDir(hourly.wind_direction_10m[i] ?? 0);
      const wc  = hourly.weathercode[i] ?? 0;
      const hot = ws >= threshold;
      const bg  = hot ? '#d1fae5' : '#f9fafb';
      const fw  = hot ? '700' : '400';
      return `
        <tr style="background:${bg}">
          <td style="padding:6px 10px;font-weight:700;color:#374151">${hour}</td>
          <td style="padding:6px 10px;text-align:center">${wmoEmoji(wc)}</td>
          <td style="padding:6px 10px;font-weight:${fw};color:${hot ? '#065f46' : '#374151'}">${ws} kn</td>
          <td style="padding:6px 10px;color:#6b7280">${wg} kn</td>
          <td style="padding:6px 10px;color:#374151">${wd}</td>
        </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:32px auto">
    <tr>
      <td style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
        <p style="margin:0;color:#38bdf8;font-size:18px;font-weight:700">💨 WindFlowRadar</p>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">Previsión de viento · ${profile.email_notif_location}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:16px 24px">
        <p style="margin:0 0 12px;color:#374151;font-size:13px">
          📅 <strong>${dateLabel}</strong>
        </p>
        <p style="margin:0 0 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;font-size:12px;color:#1e40af">
          Umbral configurado: <strong>${threshold} kn</strong> · Rango horario: ${from} – ${to}<br>
          Las filas en verde indican viento igual o superior al umbral.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Hora</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase">Cielo</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Viento</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Ráfaga</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Dir.</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af;font-size:13px">Sin datos para el rango horario</td></tr>'}</tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
          <a href="https://windradar.github.io" style="color:#38bdf8;text-decoration:none">windradar.github.io</a>
          · Datos: Open-Meteo · Para dejar de recibir emails, desactiva las notificaciones en Configuración.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  const auth = req.headers.get('Authorization') ?? '';

  // Determine call mode: cron (all users + time check) or test (single user, immediate)
  let testUserId: string | null = null;

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    // Authorized cron call — process all users
  } else {
    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const { data: { user } } = await anonClient.auth.getUser(token);
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
    testUserId = user.id;
  }

  const now         = new Date();
  const currentHour = madridHour(now);
  const dateLabel   = madridDateLabel(now);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let query = supabase
    .from('profiles')
    .select('user_id, email_notif_address, email_notif_location, email_notif_lat, email_notif_lon, email_notif_time1, email_notif_time2, email_notif_range_from, email_notif_range_to, email_notif_min_wind')
    .eq('email_notif_enabled', true)
    .not('email_notif_address', 'is', null)
    .not('email_notif_lat', 'is', null);

  if (testUserId) {
    query = query.eq('user_id', testUserId);
  }

  const { data: profiles, error } = await query;

  if (error) {
    console.error('DB error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  }

  // Time check skipped in test mode
  const toSend = testUserId
    ? (profiles ?? [])
    : (profiles ?? []).filter((p: any) =>
        p.email_notif_time1 === currentHour ||
        (p.email_notif_time2 && p.email_notif_time2 === currentHour)
      );

  if (!toSend.length) {
    return new Response(JSON.stringify({ sent: 0, total: 0, hour: currentHour, testMode: !!testUserId }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const results: string[] = [];
  for (const p of toSend as any[]) {
    try {
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${p.email_notif_lat}&longitude=${p.email_notif_lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weathercode&wind_speed_unit=kmh&timezone=Europe%2FMadrid&forecast_days=1`;
      const wx   = await (await fetch(wxUrl)).json();
      const html = buildHtml(p as ProfileRow, wx.hourly as WxHourly, dateLabel);
      const subject = `💨 Previsión ${p.email_notif_location} · ${currentHour}`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [p.email_notif_address], subject, html }),
      });

      const body = await res.text();
      if (!res.ok) {
        console.error(`Resend error for ${p.email_notif_address}:`, body);
        results.push(`❌ ${p.email_notif_address}: ${body.slice(0, 120)}`);
      } else {
        results.push(`✅ ${p.email_notif_address}`);
      }
    } catch (e) {
      results.push(`❌ ${p.email_notif_address}: ${(e as Error).message}`);
    }
  }

  return new Response(JSON.stringify({ sent: results.filter(r => r.startsWith('✅')).length, total: toSend.length, results, testMode: !!testUserId }), {
    status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
});
