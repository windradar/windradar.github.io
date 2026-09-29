import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  itemId: string;
  photoUrl: string | null;
  onUpdated: (newUrl: string | null) => void;
  size?: 'sm' | 'md';
}

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
// Must stay below the bucket's file_size_limit (3 MB)
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_SIDE = 1600;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  // JPEG has no alpha: transparent PNGs would otherwise turn black
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('No se pudo procesar la imagen');
  return blob;
}

export default function MaterialPhoto({ itemId, photoUrl, onUpdated, size = 'md' }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const dim = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16';

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!ALLOWED.includes(file.type)) { toast.error('Formato no válido (jpg, png, webp)'); return; }
    if (file.size > MAX_INPUT_BYTES) { toast.error('Máx 20 MB'); return; }

    setUploading(true);
    try {
      const blob = await resizeToJpeg(file);
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error('La imagen es demasiado grande');
      const path = `${user.id}/${itemId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('material-photos')
        .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('material-photos').getPublicUrl(path);
      const newUrl = pub.publicUrl;

      if (photoUrl) {
        const oldPath = extractPath(photoUrl);
        if (oldPath) await supabase.storage.from('material-photos').remove([oldPath]);
      }

      const { error: dbErr } = await supabase.from('material_items')
        .update({ photo_url: newUrl }).eq('id', itemId);
      if (dbErr) throw dbErr;

      onUpdated(newUrl);
      toast.success('Foto subida');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error subiendo foto');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!photoUrl || !user) return;
    if (!confirm('¿Eliminar la foto?')) return;
    const path = extractPath(photoUrl);
    if (path) await supabase.storage.from('material-photos').remove([path]);
    const { error } = await supabase.from('material_items').update({ photo_url: null }).eq('id', itemId);
    if (error) { toast.error(error.message); return; }
    onUpdated(null);
  };

  return (
    <>
      <div className={`group relative ${dim} shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40`}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
        {photoUrl ? (
          <>
            {/* Click anywhere on the photo to enlarge */}
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              className="h-full w-full cursor-zoom-in"
              title="Ver foto"
            >
              <img src={photoUrl} alt="material" className="h-full w-full object-cover" loading="lazy" />
            </button>
            {/* Delete – top-right corner, on hover (always visible on touch screens) */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removePhoto(); }}
              className="absolute right-0 top-0 rounded-bl bg-background/80 p-1 text-destructive opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              title="Eliminar foto"
              aria-label="Eliminar foto"
            >
              <X size={12} />
            </button>
            {/* Change – bottom-right corner, on hover (always visible on touch screens) */}
            {!uploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="absolute bottom-0 right-0 rounded-tl bg-background/80 p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-primary [@media(hover:none)]:opacity-100"
                title="Cambiar foto"
                aria-label="Cambiar foto"
              >
                <ImagePlus size={12} />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full items-center justify-center text-muted-foreground hover:text-primary"
            title="Subir foto"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          </button>
        )}
      </div>

      {photoUrl && (
        <Dialog open={enlarged} onOpenChange={setEnlarged}>
          <DialogContent className="max-w-2xl border-border bg-card p-2">
            <DialogTitle className="sr-only">Foto del material</DialogTitle>
            <img
              src={photoUrl}
              alt="material"
              className="max-h-[85vh] w-full rounded object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function extractPath(publicUrl: string): string | null {
  const marker = '/material-photos/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
