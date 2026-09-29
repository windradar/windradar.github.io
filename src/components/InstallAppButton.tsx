import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useInstallMode, promptInstall } from '@/lib/install-prompt';

interface Props {
  className?: string;
}

// Renders nothing when the app is already installed or the browser cannot install it
export function InstallAppButton({ className }: Props) {
  const { t } = useTranslation();
  const mode = useInstallMode();
  const [iosOpen, setIosOpen] = useState(false);

  if (!mode) return null;

  return (
    <>
      <button
        onClick={() => (mode === 'prompt' ? void promptInstall() : setIosOpen(true))}
        className={className ?? 'inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110'}
      >
        <Download size={14} /> {t('install.button')}
      </button>

      {mode === 'ios' && (
        <Dialog open={iosOpen} onOpenChange={setIosOpen}>
          <DialogContent className="max-w-sm border-border bg-card">
            <DialogTitle className="font-display text-lg font-extrabold">{t('install.iosTitle')}</DialogTitle>
            <ol className="mt-2 space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Share size={14} /></span>
                <span>{t('install.iosStep1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><SquarePlus size={14} /></span>
                <span>{t('install.iosStep2')}</span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">{t('install.iosNote')}</p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
