import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ImagePlus, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Session } from '@/lib/session-stats';
import {
  CW, CH, STORY_TEMPLATES, STORY_FIELDS, DEFAULT_STORY_PREFS, SAMPLE_SESSION,
  drawStory, loadStoryPrefs, saveStoryPrefs, loadImage, loadMaterialImages,
  type StoryPrefs, type StoryTemplate, type StoryPos, type StoryAlign,
} from '@/lib/story-card';

const POSITIONS: StoryPos[] = ['top', 'mid', 'bottom'];
const ALIGNS: StoryAlign[] = ['left', 'center'];

export default function StoryCardEditor() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<StoryPrefs>(loadStoryPrefs);
  const [session, setSession] = useState<Session>(SAMPLE_SESSION);
  const [isSample, setIsSample] = useState(true);
  const [matImgs, setMatImgs] = useState<Record<string, HTMLImageElement>>({});
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const canvasRefs = useRef<Record<StoryTemplate, HTMLCanvasElement | null>>({ franja: null, foto: null, ficha: null });

  // Vista previa con la última sesión que tenga datos de viento
  useEffect(() => {
    if (!user) return;
    supabase.from('training_sessions').select('*')
      .not('weather_snapshot', 'is', null)
      .order('session_date', { ascending: false }).order('start_time', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const s = (data as unknown as Session[] | null)?.[0];
        if (s) { setSession(s); setIsSample(false); }
      });
    supabase.from('material_items').select('name, photo_url').not('photo_url', 'is', null)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const map: Record<string, string> = {};
        for (const it of data) { if (it.photo_url) map[it.name] = it.photo_url; }
        setMatImgs(await loadMaterialImages(map));
      });
  }, [user]);

  useEffect(() => {
    for (const tpl of STORY_TEMPLATES) {
      const cv = canvasRefs.current[tpl];
      if (cv) drawStory(cv, session, { ...prefs, template: tpl }, bgImg, matImgs);
    }
  }, [prefs, session, bgImg, matImgs]);

  useEffect(() => () => { if (bgUrl) URL.revokeObjectURL(bgUrl); }, [bgUrl]);

  const update = useCallback((patch: Partial<StoryPrefs>) => {
    setPrefs(p => {
      const next = { ...p, ...patch };
      saveStoryPrefs(next);
      return next;
    });
  }, []);

  const toggleField = (k: keyof StoryPrefs['fields']) =>
    update({ fields: { ...prefs.fields, [k]: !prefs.fields[k] } });

  const handlePhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    try {
      setBgImg(await loadImage(url));
      setBgUrl(url);
    } catch {
      URL.revokeObjectURL(url);
      toast.error(t('storyCard.photoError'));
    }
  };

  const reset = () => {
    saveStoryPrefs(DEFAULT_STORY_PREFS);
    setPrefs(DEFAULT_STORY_PREFS);
    toast.success(t('storyCard.resetDone'));
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
    }`;
  const seg = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/sessions" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> {t('storyCard.backToSessions')}
        </Link>

        <div className="mb-2 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold">🖼️ {t('storyCard.title')}</h1>
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <RotateCcw size={14} /> {t('storyCard.reset')}
          </button>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{t('storyCard.intro')}</p>

        {/* Plantillas */}
        <section className="mb-6">
          <h2 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('storyCard.defaultTemplate')}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {STORY_TEMPLATES.map(tpl => {
              const active = prefs.template === tpl;
              return (
                <button
                  key={tpl}
                  onClick={() => update({ template: tpl })}
                  aria-pressed={active}
                  className="group flex flex-col gap-2 text-left">
                  <div className={`w-full rounded-xl border-2 p-0.5 transition-colors ${active ? 'border-primary' : 'border-transparent group-hover:border-border'}`}>
                    <canvas
                      ref={el => { canvasRefs.current[tpl] = el; }}
                      width={CW}
                      height={CH}
                      className="block h-auto w-full rounded-lg shadow-lg"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${active ? 'text-primary' : ''}`}>{t(`storyCard.templates.${tpl}`)}</span>
                    {active && <Check size={14} className="text-primary" />}
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">{t(`storyCard.templateDesc.${tpl}`)}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {isSample ? t('storyCard.previewSample') : t('storyCard.previewLast')}
          </p>
        </section>

        {/* Opciones */}
        <section className="space-y-5 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('storyCard.fields')}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {STORY_FIELDS.map(k => (
                <button key={k} onClick={() => toggleField(k)} aria-pressed={prefs.fields[k]} className={chip(prefs.fields[k])}>
                  {t(`storyCard.fieldNames.${k}`)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('storyCard.fieldsHint')}</p>
          </div>

          <div className="flex flex-wrap gap-6">
            <div>
              <h2 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('storyCard.position')}
              </h2>
              <div className="inline-flex divide-x divide-border overflow-hidden rounded-md border border-border">
                {POSITIONS.map(p => (
                  <button key={p} onClick={() => update({ pos: p })} aria-pressed={prefs.pos === p} className={seg(prefs.pos === p)}>
                    {t(`storyCard.positions.${p}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('storyCard.alignment')}
              </h2>
              <div className="inline-flex divide-x divide-border overflow-hidden rounded-md border border-border">
                {ALIGNS.map(a => (
                  <button key={a} onClick={() => update({ align: a })} aria-pressed={prefs.align === a} className={seg(prefs.align === a)}>
                    {t(`storyCard.aligns.${a}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('storyCard.testPhoto')}
              </h2>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/70">
                  <ImagePlus size={14} /> {t('storyCard.uploadPhoto')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])}
                  />
                </label>
                {bgImg && (
                  <button
                    onClick={() => { setBgImg(null); setBgUrl(null); }}
                    title={t('storyCard.removePhoto')}
                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t('storyCard.savedHint')}</p>
        </section>
      </div>
    </div>
  );
}
