import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chromium fires beforeinstallprompt once, early: it is captured at import time
// (main.tsx imports this module) so a button can use it later.
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferred = null;
  notify();
});

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** 'prompt': native install dialog available · 'ios': manual steps · null: nothing to offer */
export type InstallMode = 'prompt' | 'ios' | null;

function getMode(): InstallMode {
  if (installed || isStandalone()) return null;
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  return null;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getMode, getMode);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  notify();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome === 'accepted';
}
