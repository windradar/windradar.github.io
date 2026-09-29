// Supabase Edge Function — Web Push wind alerts
//
// Reuses the WhatsApp alert config stored in profiles (whatsapp_alert_location,
// _lat, _lon, _time1, _time2, _range_from, _range_to) and email_notif_min_wind.
// Devices are stored in push_subscriptions (one row per device).
//
// SCHEDULE: pg_cron job 'windradar-push-alerts' (see migration 20260928120000),
//   hourly at minute 10, Authorization: Bearer <CRON_SECRET>.
//
// ENV VARS (Supabase Dashboard > Edge Functions > Secrets):
//   CRON_SECRET    – same value used by the other alert functions
//   VAPID_KEYS     – JSON {"publicKey": JWK, "privateKey": JWK}
//   VAPID_SUBJECT  – contact for push services, e.g. mailto:you@example.com
//
// JWT verification must be off (supabase/config.toml): CRON_SECRET is not a JWT,
// so the gateway would reject the cron call before reaching the check below.
//
// TEST MODE: POST with a valid user JWT — pushes immediately to that user's
// devices, ignoring the time schedule and the threshold. One test every 5
// minutes per user (claim_test_slot, migration 20260929120000).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://windradar.github.io',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']

function dirShort(deg: number): string {
  return DIRS[Math.round(deg / 22.5) % 16]
}

function kmhToKn(kmh: number): number {
  return kmh * 0.539957
}

function hourLabel(hr: string): string {
  return hr.slice(0, 2).replace(/^0/, '')
}

interface Profile {
  user_id: string
  whatsapp_alert_location: string | null
  whatsapp_alert_lat: number | null
  whatsapp_alert_lon: number | null
  whatsapp_alert_time1: string | null
  whatsapp_alert_time2: string | null
  whatsapp_alert_range_from: string | null
  whatsapp_alert_range_to: string | null
  whatsapp_alert_tz: string | null
  whatsapp_alert_dirs: number[] | null
  email_notif_min_wind: number | null
}

interface Subscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface Payload {
  title: string
  body: string
  url: string
  tag: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

const TEST_COOLDOWN_SECONDS = 300

// Sector 0-15 (0 = N) of a direction the wind blows FROM; empty/null list = any
function directionAllowed(deg: number, dirs: number[] | null): boolean {
  if (!dirs || dirs.length === 0) return true
  const sector = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  return dirs.includes(sector)
}

// null when the timezone is missing or not a valid IANA name
function localHourIn(tz: string | null, now: Date): string | null {
  if (!tz) return null
  try {
    const h = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(now)
    return `${h.padStart(2, '0')}:00`
  } catch {
    return null
  }
}

// The endpoint comes from the browser and is stored by the user, so without
// this check the function could be made to POST to any URL (SSRF).
const PUSH_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'notify.windows.com', 'push.apple.com']

function isAllowedEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false
    return PUSH_HOSTS.some(h => url.hostname === h || url.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

// Returns null when the alert should not be sent (cron mode only)
async function buildPayload(
  p: Profile, testMode: boolean, nowUtc: Date, onTimezone: (tz: string) => Promise<unknown>,
): Promise<Payload | null> {
  if (p.whatsapp_alert_lat === null || p.whatsapp_alert_lon === null) {
    return testMode
      ? { title: 'WindFlowRadar', body: 'Notificaciones activadas. Configura el spot en Ajustes para recibir las alertas de viento.', url: '/', tag: 'wind-alert' }
      : null
  }

  const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${p.whatsapp_alert_lat}&longitude=${p.whatsapp_alert_lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto&forecast_days=1`
  const wx = await fetch(wxUrl).then(r => r.json())

  // Profiles saved before the tz column existed
  if (!localHourIn(p.whatsapp_alert_tz, nowUtc) && typeof wx.timezone === 'string' && localHourIn(wx.timezone, nowUtc)) {
    await onTimezone(wx.timezone)
  }

  const offsetSec: number = wx.utc_offset_seconds ?? 0
  const localNow = new Date(nowUtc.getTime() + offsetSec * 1000)
  const localHour = `${String(localNow.getUTCHours()).padStart(2, '0')}:00`
  if (!testMode && localHour !== p.whatsapp_alert_time1 && localHour !== (p.whatsapp_alert_time2 ?? '')) {
    return null
  }

  const rangeFrom = p.whatsapp_alert_range_from ?? '06:00'
  const rangeTo   = p.whatsapp_alert_range_to   ?? '20:00'
  const threshold = p.email_notif_min_wind      ?? 10
  const location  = p.whatsapp_alert_location   ?? 'tu spot'
  const h = wx.hourly

  let firstWindy: string | null = null
  let lastWindy: string | null = null
  let maxKn = -1, maxGust = 0, maxDir = 0, maxHr = ''

  for (let i = 0; i < h.time.length; i++) {
    const hr: string = h.time[i].slice(11, 16)
    if (hr < rangeFrom || hr > rangeTo) continue
    const kn = Math.round(kmhToKn(h.wind_speed_10m[i] ?? 0))
    if (kn >= threshold && directionAllowed(h.wind_direction_10m[i] ?? 0, p.whatsapp_alert_dirs)) {
      firstWindy ??= hr
      lastWindy = hr
    }
    if (kn > maxKn) {
      maxKn = kn
      maxGust = Math.round(kmhToKn(h.wind_gusts_10m[i] ?? 0))
      maxDir = h.wind_direction_10m[i] ?? 0
      maxHr = hr
    }
  }

  if (firstWindy === null) {
    if (!testMode) return null
    return {
      title: `${location} · hoy`,
      body: `Sin viento ≥ ${threshold} kn entre ${hourLabel(rangeFrom)} y ${hourLabel(rangeTo)} h. Máx. ${maxKn} kn a las ${hourLabel(maxHr)} h.`,
      url: '/',
      tag: 'wind-alert',
    }
  }

  const span = firstWindy === lastWindy
    ? `a las ${hourLabel(firstWindy)} h`
    : `de ${hourLabel(firstWindy)} a ${hourLabel(lastWindy!)} h`
  return {
    title: `💨 Viento hoy en ${location}`,
    body: `≥ ${threshold} kn ${span}. Máx. ${maxKn} kn (raf. ${maxGust}) ${dirShort(maxDir)} a las ${hourLabel(maxHr)} h.`,
    url: '/',
    tag: 'wind-alert',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const auth = req.headers.get('Authorization') ?? ''

  let testUserId: string | null = null
  if (!(cronSecret && auth === `Bearer ${cronSecret}`)) {
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const { data: { user } } = await anonClient.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
    testUserId = user.id
  }

  const vapidKeysRaw = Deno.env.get('VAPID_KEYS')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  if (!vapidKeysRaw || !vapidSubject) {
    return json({ processed: 0, error: 'VAPID_KEYS / VAPID_SUBJECT not configured' }, 500)
  }
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: vapidSubject,
    vapidKeys: await webpush.importVapidKeys(JSON.parse(vapidKeysRaw)),
  })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (testUserId) {
    const { data: claimed, error: rpcError } = await supabase.rpc('claim_test_slot', {
      p_user_id: testUserId, p_channel: 'push', p_cooldown_seconds: TEST_COOLDOWN_SECONDS,
    })
    if (rpcError) {
      console.error('claim_test_slot error:', rpcError.message)
      return json({ error: 'internal' }, 500)
    }
    if (!claimed) return json({ error: 'too_soon', retryAfter: TEST_COOLDOWN_SECONDS }, 429)
  }

  let subQuery = supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
  if (testUserId) subQuery = subQuery.eq('user_id', testUserId)
  const { data: subs, error: subError } = await subQuery
  if (subError) {
    console.error('push_subscriptions error:', subError.message)
    return json({ error: 'internal' }, 500)
  }

  const subsByUser = new Map<string, Subscription[]>()
  for (const s of (subs ?? []) as Subscription[]) {
    if (!isAllowedEndpoint(s.endpoint)) {
      console.warn(`Rejected push endpoint for ${s.user_id}, deleting subscription ${s.id}`)
      await supabase.from('push_subscriptions').delete().eq('id', s.id)
      continue
    }
    subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])
  }
  if (!subsByUser.size) {
    return json({ processed: 0, sent: 0, results: [], testMode: !!testUserId })
  }

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('user_id, whatsapp_alert_location, whatsapp_alert_lat, whatsapp_alert_lon, whatsapp_alert_time1, whatsapp_alert_time2, whatsapp_alert_range_from, whatsapp_alert_range_to, whatsapp_alert_tz, whatsapp_alert_dirs, email_notif_min_wind')
    .in('user_id', [...subsByUser.keys()])
  if (profError) {
    console.error('profiles error:', profError.message)
    return json({ error: 'internal' }, 500)
  }

  const nowUtc = new Date()
  const results: string[] = []
  let sent = 0

  for (const p of (profiles ?? []) as Profile[]) {
    // Skip before calling Open-Meteo: most users are not due this hour
    const knownHour = localHourIn(p.whatsapp_alert_tz, nowUtc)
    if (!testUserId && knownHour && knownHour !== p.whatsapp_alert_time1 && knownHour !== (p.whatsapp_alert_time2 ?? '')) {
      continue
    }
    try {
      const payload = await buildPayload(p, !!testUserId, nowUtc, tz =>
        supabase.from('profiles').update({ whatsapp_alert_tz: tz }).eq('user_id', p.user_id))
      if (!payload) continue

      let userSent = 0
      for (const s of subsByUser.get(p.user_id) ?? []) {
        try {
          await appServer
            .subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
            .pushTextMessage(JSON.stringify(payload), { ttl: 6 * 3600, urgency: webpush.Urgency.High })
          userSent++
        } catch (e) {
          // 404/410: the browser dropped the subscription (app uninstalled, permission revoked)
          if (e instanceof webpush.PushMessageError && (e.isGone() || e.response.status === 404)) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id)
            results.push('Dispositivo dado de baja, eliminado')
          } else {
            console.error(`Push error for subscription ${s.id}:`, String(e))
            results.push('Error al enviar a un dispositivo')
          }
        }
      }
      sent += userSent
      if (userSent > 0) results.unshift(`Notificación enviada a ${userSent} dispositivo(s)`)
    } catch (e: unknown) {
      console.error(`Alert error for ${p.user_id}:`, (e as Error).message)
      results.push('Error al preparar la alerta')
    }
  }

  return json({ processed: profiles?.length ?? 0, sent, results, testMode: !!testUserId })
})
