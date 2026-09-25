import { useRef, useEffect, useState, useCallback } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Session } from '@/lib/session-stats';
import {
  CW, CH, STORY_TEMPLATES, drawStory, loadStoryPrefs, loadImage, fetchAsBlobUrl, loadMaterialImages,
  type StoryTemplate,
} from '@/lib/story-card';

interface Props {
  session: Session | null;
  materialPhotos: Record<string, string>;
  onClose: () => void;
}

export default function SessionStoryShare({ session, materialPhotos, onClose }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgBlobUrl, setBgBlobUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [matImgs, setMatImgs] = useState<Record<string, HTMLImageElement>>({});
  const [prefs, setPrefs] = useState(loadStoryPrefs);
  const [template, setTemplate] = useState<StoryTemplate>(prefs.template);

  const matEntries = Object.entries(materialPhotos);

  // Al abrir, se parte de la plantilla y los campos guardados en el editor
  useEffect(() => {
    if (!session) return;
    const p = loadStoryPrefs();
    setPrefs(p);
    setTemplate(p.template);
  }, [session]);

  useEffect(() => {
    if (!Object.keys(materialPhotos).length) return;
    let cancelled = false;
    loadMaterialImages(materialPhotos).then(loaded => { if (!cancelled) setMatImgs(loaded); });
    return () => { cancelled = true; };
  }, [materialPhotos]);

  useEffect(() => {
    if (!session || !canvasRef.current) return;
    drawStory(canvasRef.current, session, { ...prefs, template }, bgImg, matImgs);
  }, [session, prefs, template, bgImg, matImgs]);

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

        {/* Plantilla */}
        <div className="space-y-2">
          <p className="text-[0.63rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('storyCard.template')}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {STORY_TEMPLATES.map(tpl => (
              <button
                key={tpl}
                onClick={() => setTemplate(tpl)}
                aria-pressed={template === tpl}
                className={`rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${
                  template === tpl
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`storyCard.templates.${tpl}`)}
              </button>
            ))}
          </div>
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
