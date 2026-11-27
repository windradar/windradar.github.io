import { toast } from 'sonner';

/**
 * Shares a text with a link: the share sheet on phones, the clipboard on desktop,
 * wa.me as a last resort (same order as the WhatsApp share of the forecast).
 */
export async function shareText(text: string, url: string, copiedMessage: string): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
  }
  const full = `${text}\n${url}`;
  try {
    await navigator.clipboard.writeText(full);
    toast.success(copiedMessage);
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener');
  }
}

/** Copies a link to the clipboard and says so */
export async function copyLink(url: string, copiedMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(copiedMessage);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
