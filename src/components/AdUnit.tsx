import { useEffect, useRef } from 'react';
import { useConsent } from '@/hooks/useConsent';

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

const CLIENT = 'ca-pub-7799630223343814';

// Create ad units at https://adsense.google.com → Ads → By ad unit
// and replace these slot IDs with the ones AdSense provides.
// eslint-disable-next-line react-refresh/only-export-components
export const AD_SLOTS = {
  mainPage: '5276015621',   // slot for / (Index)
  helpPage: '5276015621',   // slot for /help
} as const;

interface Props {
  slot: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
}

export function AdUnit({ slot, format = 'auto', className = '' }: Props) {
  const { state } = useConsent();
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!state.categories.marketing || !slot) return;
    const ins = insRef.current;
    if (!ins || (ins as HTMLElement & { dataset: DOMStringMap }).dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* noop */ }
  }, [state.categories.marketing, slot]);

  if (!state.categories.marketing || !slot) return null;

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
