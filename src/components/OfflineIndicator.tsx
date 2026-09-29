import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Offline the PWA shows cached forecasts (up to 1 h old): tell the user
export function OfflineIndicator() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-2 z-[210] flex justify-center px-3"
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-background/95 px-3 py-1.5 text-xs font-semibold text-amber-500 shadow-lg backdrop-blur">
        <WifiOff size={14} />
        {t('offline.message')}
      </div>
    </div>
  );
}
