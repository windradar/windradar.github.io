// Supabase Edge Function — Ecowitt station sync
//
// For every active row in `stations`, reads the latest observation from the
// Ecowitt cloud API (device/real_time), converts it to knots / °C / mm / hPa and
// stores one row in `station_readings`. No row is stored twice for the same
// station and measurement time.
//
// SCHEDULE: pg_cron job 'windradar-ecowitt-sync' (migration 20261126120000),
//   every minute, Authorization: Bearer <CRON_SECRET>.
//
// ENV VARS (Supabase Dashboard > Edge Functions > Secrets):
//   CRON_SECRET                – same value used by the other cron functions
//   ECOWITT_APPLICATION_KEY    – from ecowitt.net > Account > API
//   ECOWITT_API_KEY            – idem
//
// JWT verification must be off (supabase/config.toml): CRON_SECRET is not a JWT.
//
// DRY RUN: POST {"dry_run": true} with the same Bearer. Calls Ecowitt, returns the
// raw response and the normalised reading per station and stores nothing. Use it
// to check the real field names and units of the station.
//
// UNITS: no unit parameters are sent. Each value comes back with its own `unit`
// and is converted from that, so the result does not depend on unit ids. A value
// whose unit is not recognised is left null and logged, never guessed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ECOWITT_URL = 'https://api.ecowitt.net/api/v3/device/real_time'
const TIMEOUT_MS = 8000

interface Station {
  id: string
  name: string
  mac: string
}

interface EcowittValue {
  time?: string | number
  unit?: string
  value?: string | number
}

interface Reading {
  recorded_at: string
  wind_speed_kn: number | null
  wind_gust_kn: number | null
  wind_dir_deg: number | null
  temp_c: number | null
  humidity: number | null
  rain_rate_mm: number | null
  uv_index: number | null
  pressure_hpa: number | null
}

type Json = Record<string, unknown>

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function pick(data: Json, ...path: string[]): EcowittValue | null {
  let cur: unknown = data
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return null
    cur = (cur as Json)[key]
  }
  return cur !== null && typeof cur === 'object' ? (cur as EcowittValue) : null
}

function normUnit(unit: string | undefined): string {
  return (unit ?? '').toLowerCase().replace(/[\s°º]/g, '').replace('℃', 'c').replace('℉', 'f')
}

type Kind = 'wind' | 'temp' | 'rain' | 'pressure' | 'plain'

function convert(kind: Kind, v: number, unit: string): number | null {
  const u = normUnit(unit)
  switch (kind) {
    case 'wind':
      if (['kn', 'kt', 'kts', 'knot', 'knots'].includes(u)) return v
      if (u === 'mph') return v * 0.868976
      if (['km/h', 'kmh', 'kph'].includes(u)) return v / 1.852
      if (['m/s', 'ms'].includes(u)) return v * 1.943844
      return null
    case 'temp':
      if (u === 'c') return v
      if (u === 'f') return ((v - 32) * 5) / 9
      return null
    case 'rain':
      if (['mm/hr', 'mm/h'].includes(u)) return v
      if (['in/hr', 'in/h'].includes(u)) return v * 25.4
      return null
    case 'pressure':
      if (['hpa', 'mbar', 'mb'].includes(u)) return v
      if (u === 'inhg') return v * 33.8639
      if (u === 'mmhg') return v * 1.33322
      if (u === 'kpa') return v * 10
      return null
    default:
      return v
  }
}

function num(
  field: EcowittValue | null,
  kind: Kind,
  label: string,
  station: string,
): number | null {
  if (!field || field.value === undefined || field.value === null || field.value === '') return null
  const v = Number(field.value)
  if (!Number.isFinite(v)) return null
  const out = convert(kind, v, field.unit ?? '')
  if (out === null) {
    console.warn(`[ecowitt-sync] ${station}: unit "${field.unit}" not recognised for ${label}, value skipped`)
    return null
  }
  return Math.round(out * 100) / 100
}

function toIso(time: string | number | undefined): string | null {
  const s = Number(time)
  if (!Number.isFinite(s) || s <= 0) return null
  return new Date(s * 1000).toISOString()
}

function normalize(station: Station, body: Json): Reading | null {
  const data = body.data as Json | undefined
  if (!data || Array.isArray(data) || Object.keys(data).length === 0) return null
  const n = station.name

  const windSpeed = pick(data, 'wind', 'wind_speed')
  const recordedAt = toIso(windSpeed?.time) ?? toIso(pick(data, 'outdoor', 'temperature')?.time)
    ?? toIso(body.time as string)
  if (!recordedAt) return null

  const rain = pick(data, 'rainfall_piezo', 'rain_rate') ?? pick(data, 'rainfall', 'rain_rate')
  const pressure = pick(data, 'pressure', 'relative') ?? pick(data, 'pressure', 'absolute')

  return {
    recorded_at: recordedAt,
    wind_speed_kn: num(windSpeed, 'wind', 'wind_speed', n),
    wind_gust_kn: num(pick(data, 'wind', 'wind_gust'), 'wind', 'wind_gust', n),
    wind_dir_deg: num(pick(data, 'wind', 'wind_direction'), 'plain', 'wind_direction', n),
    temp_c: num(pick(data, 'outdoor', 'temperature'), 'temp', 'temperature', n),
    humidity: num(pick(data, 'outdoor', 'humidity'), 'plain', 'humidity', n),
    rain_rate_mm: num(rain, 'rain', 'rain_rate', n),
    uv_index: num(pick(data, 'solar_and_uvi', 'uvi'), 'plain', 'uvi', n),
    pressure_hpa: num(pressure, 'pressure', 'pressure', n),
  }
}

async function fetchStation(station: Station, appKey: string, apiKey: string): Promise<Json> {
  const url = new URL(ECOWITT_URL)
  url.searchParams.set('application_key', appKey)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('mac', station.mac)
  url.searchParams.set('call_back', 'all')

  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json() as Json
  if (body.code !== 0 && body.code !== '0') {
    throw new Error(`Ecowitt code ${body.code}: ${body.msg}`)
  }
  return body
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  if (!cronSecret || !safeEqual(auth, `Bearer ${cronSecret}`)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const appKey = Deno.env.get('ECOWITT_APPLICATION_KEY')
  const apiKey = Deno.env.get('ECOWITT_API_KEY')
  if (!appKey || !apiKey) {
    console.error('[ecowitt-sync] ECOWITT_APPLICATION_KEY / ECOWITT_API_KEY are not set')
    return new Response(JSON.stringify({ error: 'missing secrets' }), { status: 500 })
  }

  let dryRun = false
  try {
    dryRun = (await req.json())?.dry_run === true
  } catch { /* no body */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: stations, error } = await supabase
    .from('stations')
    .select('id, name, mac')
    .eq('is_active', true)
  if (error) {
    console.error('[ecowitt-sync] cannot read stations:', error.message)
    return new Response(JSON.stringify({ error: 'stations query failed' }), { status: 500 })
  }

  const results = await Promise.all((stations as Station[]).map(async (st) => {
    try {
      const body = await fetchStation(st, appKey, apiKey)
      const reading = normalize(st, body)
      if (!reading) {
        console.warn(`[ecowitt-sync] ${st.name}: no data in the response`)
        return { station: st.name, status: 'no_data', ...(dryRun ? { raw: body } : {}) }
      }
      if (dryRun) return { station: st.name, status: 'dry_run', reading, raw: body }

      const { data: inserted, error: insErr } = await supabase
        .from('station_readings')
        .upsert(
          { station_id: st.id, ...reading, raw: body },
          { onConflict: 'station_id,recorded_at', ignoreDuplicates: true },
        )
        .select('id')
      if (insErr) throw new Error(insErr.message)
      const stored = (inserted?.length ?? 0) > 0
      console.log(`[ecowitt-sync] ${st.name}: ${stored ? 'stored' : 'unchanged'} (${reading.recorded_at})`)
      return { station: st.name, status: stored ? 'stored' : 'unchanged' }
    } catch (e) {
      const msg = e instanceof Error ? (e.name === 'TimeoutError' ? 'timeout' : e.message) : String(e)
      console.error(`[ecowitt-sync] ${st.name}: ${msg}`)
      return { station: st.name, status: 'error', error: msg }
    }
  }))

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
