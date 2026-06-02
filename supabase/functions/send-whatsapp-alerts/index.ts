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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: users, error } = await supabase
    .from('profiles')
    .select('whatsapp_number, callmebot_apikey, whatsapp_alert_time1, whatsapp_alert_time2, whatsapp_alert_range_from, whatsapp_alert_range_to, whatsapp_alert_location, whatsapp_alert_lat, whatsapp_alert_lon, email_notif_min_wind')
    .eq('whatsapp_alert_enabled', true)
    .not('whatsapp_number', 'is', null)
    .not('callmebot_apikey', 'is', null)
    .not('whatsapp_alert_lat', 'is', null)

  if (error || !users?.length) {
    return new Response(JSON.stringify({ processed: 0, error: error?.message ?? 'no users' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }

  const nowUtc = new Date()
  const results: string[] = []

  for (const u of users) {
    try {
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${u.whatsapp_alert_lat}&longitude=${u.whatsapp_alert_lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,weathercode&wind_speed_unit=kmh&timezone=auto&forecast_days=1`
      const marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${u.whatsapp_alert_lat}&longitude=${u.whatsapp_alert_lon}&hourly=wave_height&timezone=auto&forecast_days=1`

      const [wxRes, marRes] = await Promise.all([
        fetch(wxUrl).then(r => r.json()),
        fetch(marUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      // Determine local hour using the API's timezone offset
      const offsetSec: number = wxRes.utc_offset_seconds ?? 0
      const localMs = nowUtc.getTime() + offsetSec * 1000
      const localNow = new Date(localMs)
      const localHour = `${String(localNow.getUTCHours()).padStart(2, '0')}:00`

      if (localHour !== u.whatsapp_alert_time1 && localHour !== (u.whatsapp_alert_time2 ?? '')) continue

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

        if (kn >= threshold) hasWind = true

        msg += `${wmoEmoji(wc)} *${hr}* — 💨 ${kn}kn ⚡raf.${gustKn}kn 🧭${dirShort(wd)} 🌊${wh !== null ? wh.toFixed(1) + 'm' : '-'}\n`
      }

      msg += `\n_WindFlowRadar · Open-Meteo_\n\nMás información en https://windradar.github.io/`

      if (!hasWind) {
        results.push(`${u.whatsapp_alert_location}: por debajo del umbral, no enviado`)
        continue
      }

      const phone = (u.whatsapp_number as string).replace(/\D/g, '')
      const callUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(msg)}&apikey=${u.callmebot_apikey}`
      const callRes = await fetch(callUrl)
      results.push(`${u.whatsapp_alert_location}: enviado (HTTP ${callRes.status})`)

    } catch (e: unknown) {
      results.push(`Error: ${(e as Error).message}`)
    }
  }

  return new Response(JSON.stringify({ processed: users.length, results }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
})
