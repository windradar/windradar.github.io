// Supabase Edge Function — WhatsApp wind alerts via CallMeBot
//
// SETUP: Schedule this function to run every hour.
//
// Option A – cron-job.org (free):
//   URL: https://<project-ref>.supabase.co/functions/v1/send-whatsapp-alerts
//   Schedule: every hour (0 * * * *)
//   Header: Authorization: Bearer <CRON_SECRET>
//
// Option B – Supabase Dashboard: Database > Cron Jobs
//   Same URL + header, schedule: 0 * * * *
//
// ENV VARS (Supabase Dashboard > Edge Functions > send-whatsapp-alerts > Secrets):
//   CRON_SECRET  – any random string to prevent unauthorized calls
//
// TEST MODE: call via supabase.functions.invoke('send-whatsapp-alerts') with a
// valid user JWT — sends immediately to that user only, ignoring time schedule.
// One test every 5 minutes per user (claim_test_slot, migration 20260929120000).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function wmoEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 65) return '🌧️'
  if (code <= 75) return '🌨️'
  if (code <= 82) return '🌧️'
  if (code <= 99) return '⛈️'
  return '☁️'
}

function humanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${days[date.getDay()]} ${d} de ${months[m - 1]}`
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// CallMeBot answers with an HTML page that may echo the phone and the API key
function summarizeCallMeBot(body: string, phone: string, apikey: string): string {
  let text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (apikey) text = text.split(apikey).join('***')
  if (phone) text = text.split(phone).join('***')
  return text.slice(0, 100)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const auth = req.headers.get('Authorization') ?? ''

  // Determine call mode: cron (all users + time check) or test (single user, immediate)
  let testUserId: string | null = null

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    // Authorized cron call — process all users
  } else {
    // Try as Supabase user JWT (test call from the frontend)
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const { data: { user } } = await anonClient.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
    testUserId = user.id
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (testUserId) {
    const { data: claimed, error: rpcError } = await supabase.rpc('claim_test_slot', {
      p_user_id: testUserId, p_channel: 'whatsapp', p_cooldown_seconds: TEST_COOLDOWN_SECONDS,
    })
    if (rpcError) {
      console.error('claim_test_slot error:', rpcError.message)
      return json({ error: 'internal' }, 500)
    }
    if (!claimed) return json({ error: 'too_soon', retryAfter: TEST_COOLDOWN_SECONDS }, 429)
  }

  let query = supabase
    .from('profiles')
    .select('user_id, whatsapp_number, callmebot_apikey, whatsapp_alert_time1, whatsapp_alert_time2, whatsapp_alert_range_from, whatsapp_alert_range_to, whatsapp_alert_location, whatsapp_alert_lat, whatsapp_alert_lon, whatsapp_alert_tz, whatsapp_alert_dirs, email_notif_min_wind')
    .eq('whatsapp_alert_enabled', true)
    .not('whatsapp_number', 'is', null)
    .not('callmebot_apikey', 'is', null)
    .not('whatsapp_alert_lat', 'is', null)

  if (testUserId) {
    query = query.eq('user_id', testUserId)
  }

  const { data: users, error } = await query

  if (error) {
    console.error('profiles error:', error.message)
    return json({ error: 'internal' }, 500)
  }
  if (!users?.length) {
    return json({ processed: 0, sent: 0, results: [], testMode: !!testUserId })
  }

  const nowUtc = new Date()
  const results: string[] = []
  let sent = 0

  for (const u of users) {
    // Skip before calling Open-Meteo: most users are not due this hour
    const knownHour = localHourIn(u.whatsapp_alert_tz, nowUtc)
    if (!testUserId && knownHour && knownHour !== u.whatsapp_alert_time1 && knownHour !== (u.whatsapp_alert_time2 ?? '')) {
      continue
    }
    try {
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${u.whatsapp_alert_lat}&longitude=${u.whatsapp_alert_lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weathercode&wind_speed_unit=kmh&timezone=auto&forecast_days=1`
      const marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${u.whatsapp_alert_lat}&longitude=${u.whatsapp_alert_lon}&hourly=wave_height&timezone=auto&forecast_days=1`

      const [wxRes, marRes] = await Promise.all([
        fetch(wxUrl).then(r => r.json()),
        fetch(marUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      // Profiles saved before the tz column existed
      if (!knownHour && typeof wxRes.timezone === 'string' && localHourIn(wxRes.timezone, nowUtc)) {
        await supabase.from('profiles').update({ whatsapp_alert_tz: wxRes.timezone }).eq('user_id', u.user_id)
      }

      // Determine local hour using the API's timezone offset
      const offsetSec: number = wxRes.utc_offset_seconds ?? 0
      const localMs = nowUtc.getTime() + offsetSec * 1000
      const localNow = new Date(localMs)
      const localHour = `${String(localNow.getUTCHours()).padStart(2, '0')}:00`

      // Time check is skipped in test mode
      if (!testUserId && localHour !== u.whatsapp_alert_time1 && localHour !== (u.whatsapp_alert_time2 ?? '')) {
        continue
      }

      const rangeFrom: string  = u.whatsapp_alert_range_from ?? '06:00'
      const rangeTo: string    = u.whatsapp_alert_range_to   ?? '20:00'
      const threshold: number  = u.email_notif_min_wind      ?? 10
      const h                  = wxRes.hourly
      const todayLocal: string = h.time[0]?.slice(0, 10) ?? nowUtc.toISOString().slice(0, 10)

      let hasWind = false
      let msg = `💨 *WindFlowRadar – ${u.whatsapp_alert_location}*\n📅 ${humanDate(todayLocal)} (${rangeFrom}–${rangeTo})\n\n`

      for (let i = 0; i < h.time.length; i++) {
        const hr: string = h.time[i].slice(11, 16)
        if (hr < rangeFrom || hr > rangeTo) continue

        const ws      = h.wind_speed_10m[i]    ?? 0
        const wg      = h.wind_gusts_10m[i]    ?? 0
        const wd      = h.wind_direction_10m[i] ?? 0
        const wc      = h.weathercode?.[i]      ?? 0
        const kn      = Math.round(kmhToKn(ws))
        const gustKn  = Math.round(kmhToKn(wg))
        const wh: number | null = marRes?.hourly?.wave_height?.[i] ?? null

        if (kn >= threshold && directionAllowed(wd, u.whatsapp_alert_dirs)) hasWind = true

        msg += `${wmoEmoji(wc)} *${hr}* — 💨 ${kn}kn ⚡raf.${gustKn}kn 🧭${dirShort(wd)} 🌊${wh !== null ? wh.toFixed(1) + 'm' : '-'}\n`
      }

      msg += `\n_WindFlowRadar · Open-Meteo_\n\nMás información en https://windradar.github.io/`

      // In test mode send even below threshold; in cron mode skip if no wind
      if (!testUserId && !hasWind) {
        results.push(`${u.whatsapp_alert_location}: por debajo del umbral, no enviado`)
        continue
      }

      const phone = (u.whatsapp_number as string).replace(/\D/g, '')
      const apikey = String(u.callmebot_apikey).trim()
      const callUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(msg)}&apikey=${encodeURIComponent(apikey)}`
      const callRes = await fetch(callUrl)
      const callBody = await callRes.text()
      const summary = summarizeCallMeBot(callBody, phone, apikey)
      if (callRes.ok) {
        sent++
        results.push(`✅ CallMeBot: ${summary || 'mensaje enviado'}`)
      } else {
        console.error(`CallMeBot HTTP ${callRes.status} for ${u.user_id}: ${summary}`)
        results.push(`❌ CallMeBot: ${summary || `HTTP ${callRes.status}`}`)
      }

    } catch (e: unknown) {
      console.error(`Alert error for ${u.user_id}:`, (e as Error).message)
      results.push('❌ Error al preparar la alerta')
    }
  }

  return json({ processed: users.length, sent, results, testMode: !!testUserId })
})
