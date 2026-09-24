import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

// Avisa cuando hay una versión nueva del service worker y recarga al pulsar
export function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast(t('pwa.newVersion'), {
      duration: Infinity,
      action: { label: t('pwa.reload'), onClick: () => updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
