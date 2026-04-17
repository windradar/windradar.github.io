import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';
import { SearchWithSuggestions } from '@/components/SearchSuggestions';
import { kmhToKnots, localDateStr, humanDate, windInfo, dirArrow } from '@/lib/weather-helpers';

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

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const urlSchema = z.string().trim().url('URL no válida').max(500).optional().or(z.literal(''));

export default function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [date, setDate] = useState(localDateStr(new Date()));
  const [startH, setStartH] = useState('10:00');
  const [endH, setEndH] = useState('13:00');
  const [locName, setLocName] = useState('');
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLon, setLocLon] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot[] | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [m1, setM1] = useState(''); const [m2, setM2] = useState('');
  const [m3, setM3] = useState(''); const [m4, setM4] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('training_sessions')
      .select('*').order('session_date', { ascending: false }).order('start_time', { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSessions((data as any) || []);
  }, [user]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const fetchWeatherSnapshot = useCallback(async () => {
    if (locLat === null || locLon === null) {
      toast.error('Selecciona una ubicación primero');
      return;
    }
    if (startH >= endH) { toast.error('La hora final debe ser posterior'); return; }

    setLoadingSnap(true);
    try {
      const today = localDateStr(new Date());
      const isPast = date < today;
      const isFuture = date > today;
      const inForecast = !isPast || (today.localeCompare(date) <= 7);

      let url: string;
      if (isFuture || date === today) {
        url = `https://api.open-meteo.com/v1/forecast?latitude=${locLat}&longitude=${locLon}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto&start_date=${date}&end_date=${date}`;
      } else {
        url = `https://archive-api.open-meteo.com/v1/archive?latitude=${locLat}&longitude=${locLon}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=auto&start_date=${date}&end_date=${date}`;
      }
      const marUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${locLat}&longitude=${locLon}&hourly=wave_height&timezone=auto&start_date=${date}&end_date=${date}`;

      const [wxRes, marRes] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch(marUrl).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (!wxRes.hourly) throw new Error('Sin datos meteo para esa fecha');

      const snap: Snapshot[] = [];
      for (let i = 0; i < wxRes.hourly.time.length; i++) {
        const t = wxRes.hourly.time[i];
        const hr = t.slice(11, 16);
        if (hr < startH || hr > endH) continue;
        const wd = wxRes.hourly.wind_direction_10m[i] || 0;
        snap.push({
          hour: hr,
          wind_kn: Math.round(kmhToKnots(wxRes.hourly.wind_speed_10m[i] || 0)),
          gust_kn: Math.round(kmhToKnots(wxRes.hourly.wind_gusts_10m[i] || 0)),
          dir_deg: Math.round(wd),
          dir_short: windInfo(wd).short,
          wave_m: marRes?.hourly?.wave_height?.[i] ?? null,
          temp: wxRes.hourly.temperature_2m[i] ?? null,
        });
      }
      if (!snap.length) throw new Error('No hay datos para ese rango horario');
      setSnapshot(snap);
      toast.success(`${snap.length} h cargadas`);
    } catch (e: any) {
      toast.error(e.message || 'Error cargando datos');
      setSnapshot(null);
    } finally {
      setLoadingSnap(false);
    }
  }, [locLat, locLon, date, startH, endH]);

  const resetForm = () => {
    setDate(localDateStr(new Date())); setStartH('10:00'); setEndH('13:00');
    setLocName(''); setLocLat(null); setLocLon(null); setSnapshot(null);
    setM1(''); setM2(''); setM3(''); setM4(''); setTrackingUrl(''); setNotes('');
  };

  const saveSession = async () => {
    if (!user) return;
    if (!locName) { toast.error('Falta la ubicación'); return; }
    if (startH >= endH) { toast.error('Hora fin > hora inicio'); return; }

    if (trackingUrl) {
      const u = urlSchema.safeParse(trackingUrl);
      if (!u.success) { toast.error('URL de tracking no válida'); return; }
    }

    setSaving(true);
    const { error } = await supabase.from('training_sessions').insert({
      user_id: user.id,
      session_date: date,
      start_time: startH,
      end_time: endH,
      location_name: locName,
      location_lat: locLat,
      location_lon: locLon,
      weather_snapshot: snapshot as any,
      material_1: m1.trim() || null,
      material_2: m2.trim() || null,
      material_3: m3.trim() || null,
      material_4: m4.trim() || null,
      tracking_url: trackingUrl.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Sesión guardada');
    resetForm();
    setShowForm(false);
    loadSessions();
  };

  const deleteSession = async (id: string) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Eliminada');
    setSessions(s => s.filter(x => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> Volver
        </Link>

        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold">⛵ Sesiones</h1>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
            <Plus size={16} /> {showForm ? 'Cerrar' : 'Nueva'}
          </button>
        </div>

        {showForm && (
          <section className="mb-6 rounded-xl border border-primary/30 bg-card p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider">Registrar sesión</h2>

            <div className="space-y-4">
              {/* Location search */}
              <div>
                <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Ubicación</label>
                <SearchWithSuggestions onSelect={(name, lat, lon) => { setLocName(name); setLocLat(lat); setLocLon(lon); setSnapshot(null); }} />
                {locName && <p className="mt-1 text-xs text-primary">📍 {locName}</p>}
              </div>

              {/* Date + hours */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Fecha</label>
                  <input type="date" value={date} onChange={e => { setDate(e.target.value); setSnapshot(null); }}
                    className="w-full rounded-md border border-border bg-secondary px-2 py-2 text-sm font-mono outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Inicio</label>
                  <select value={startH} onChange={e => { setStartH(e.target.value); setSnapshot(null); }}
                    className="w-full rounded-md border border-border bg-secondary px-2 py-2 text-sm font-mono outline-none focus:border-primary">
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Fin</label>
                  <select value={endH} onChange={e => { setEndH(e.target.value); setSnapshot(null); }}
                    className="w-full rounded-md border border-border bg-secondary px-2 py-2 text-sm font-mono outline-none focus:border-primary">
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={fetchWeatherSnapshot} disabled={loadingSnap || !locLat}
                className="w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20 disabled:opacity-50">
                {loadingSnap ? 'Cargando...' : '🌬️ Cargar datos meteo del rango'}
              </button>

              {snapshot && (
                <div className="rounded-md border border-border bg-secondary/40 p-3">
                  <p className="mb-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground">Snapshot ({snapshot.length} h)</p>
                  <div className="space-y-1 font-mono text-xs">
                    {snapshot.map((s, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{s.hour}</span>
                        <span>💨 {s.wind_kn}kn ⚡{s.gust_kn}kn {dirArrow(s.dir_deg)} {s.dir_short} 🌊 {s.wave_m !== null ? s.wave_m.toFixed(1) + 'm' : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Material */}
              <div>
                <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-2">Material utilizado</label>
                <div className="grid grid-cols-2 gap-2">
                  <input value={m1} onChange={e => setM1(e.target.value)} placeholder="Material 1 (ej: Tabla 130L)" maxLength={100}
                    className="rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input value={m2} onChange={e => setM2(e.target.value)} placeholder="Material 2 (ej: Vela 6.5)" maxLength={100}
                    className="rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input value={m3} onChange={e => setM3(e.target.value)} placeholder="Material 3 (ej: Aleta 32)" maxLength={100}
                    className="rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input value={m4} onChange={e => setM4(e.target.value)} placeholder="Material 4 (ej: Arnés)" maxLength={100}
                    className="rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">URL de tracking (Strava, etc.)</label>
                <input type="url" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://strava.com/activities/..."
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={2}
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>

              <button onClick={saveSession} disabled={saving}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar sesión'}
              </button>
            </div>
          </section>
        )}

        {/* List */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Historial</h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : sessions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Aún no has registrado ninguna sesión.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-bold">{s.location_name || 'Sin ubicación'}</h3>
                      <p className="text-xs text-muted-foreground">
                        {humanDate(s.session_date)} · {s.start_time}–{s.end_time}
                      </p>
                    </div>
                    <button onClick={() => deleteSession(s.id)}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {s.weather_snapshot && Array.isArray(s.weather_snapshot) && s.weather_snapshot.length > 0 && (
                    <details className="mb-2">
                      <summary className="cursor-pointer text-xs text-primary">Datos meteo ({(s.weather_snapshot as any).length} h)</summary>
                      <div className="mt-2 space-y-0.5 font-mono text-[0.7rem]">
                        {(s.weather_snapshot as any as Snapshot[]).map((w, i) => (
                          <div key={i} className="flex justify-between text-muted-foreground">
                            <span>{w.hour}</span>
                            <span>💨{w.wind_kn} ⚡{w.gust_kn} {dirArrow(w.dir_deg)}{w.dir_short} 🌊{w.wave_m !== null ? w.wave_m.toFixed(1) + 'm' : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {(s.material_1 || s.material_2 || s.material_3 || s.material_4) && (
                    <p className="mb-1 text-xs">
                      <span className="text-muted-foreground">Material: </span>
                      {[s.material_1, s.material_2, s.material_3, s.material_4].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  {s.tracking_url && (
                    <a href={s.tracking_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink size={12} /> Tracking
                    </a>
                  )}

                  {s.notes && <p className="mt-2 text-xs text-muted-foreground italic">"{s.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
