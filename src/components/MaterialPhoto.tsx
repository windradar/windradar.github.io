import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface Props {
  itemId: string;
  photoUrl: string | null;
  onUpdated: (newUrl: string | null) => void;
  size?: 'sm' | 'md';
}

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export default function MaterialPhoto({ itemId, photoUrl, onUpdated, size = 'md' }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const dim = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16';

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!ALLOWED.includes(file.type)) { toast.error('Formato no válido (jpg, png, webp)'); return; }
    if (file.size > MAX_BYTES) { toast.error('Máx 3 MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${itemId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('material-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('material-photos').getPublicUrl(path);
      const newUrl = pub.publicUrl;

      // delete old photo if any
      if (photoUrl) {
        const oldPath = extractPath(photoUrl);
        if (oldPath) await supabase.storage.from('material-photos').remove([oldPath]);
      }

      const { error: dbErr } = await supabase.from('material_items')
        .update({ photo_url: newUrl }).eq('id', itemId);
      if (dbErr) throw dbErr;

      onUpdated(newUrl);
      toast.success('Foto subida');
    } catch (err: any) {
      toast.error(err.message || 'Error subiendo foto');
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
    <div className={`relative ${dim} shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40`}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
      {photoUrl ? (
        <>
          <img src={photoUrl} alt="material" className="h-full w-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute right-0 top-0 rounded-bl bg-background/80 p-0.5 text-destructive opacity-0 transition group-hover:opacity-100"
            title="Eliminar foto"
          >
            <X size={10} />
          </button>
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
      {photoUrl && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition hover:opacity-100"
          title="Cambiar foto"
        >
          <ImagePlus size={14} />
        </button>
      )}
    </div>
  );
}

function extractPath(publicUrl: string): string | null {
  const marker = '/material-photos/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
