import { supabase } from '@/integrations/supabase/client';
import { isIos, isStandalone } from '@/lib/install-prompt';

// Public by design (like the Supabase anon key); the private half lives in the
// VAPID_KEYS secret of the send-push-alerts Edge Function
const VAPID_PUBLIC_KEY = 'BLKdWOdnAugXz4mMknOlLuM4rumR1rPAwYhYK465uXXRqrAa3o70b1o3wuwpVb5iHFw_AFTJnxC15d8bb7RX1jM';

export type PushStatus = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on';

function isSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padded = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function getPushStatus(userId: string): Promise<PushStatus> {
  // iOS only exposes PushManager once the app is installed on the home screen
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!isSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  // No registration in `vite dev` (the PWA service worker only exists in builds)
  const reg = await getRegistration();
  if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return 'off';
  // The browser subscription may belong to another account used on this device
  const { count } = await supabase.from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('endpoint', sub.endpoint);
  return count ? 'on' : 'off';
}

export async function enablePush(userId: string): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  if (!(await getRegistration())) return 'unsupported';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    });

  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
    user_agent: navigator.userAgent.slice(0, 300),
  }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
  return 'on';
}

export async function disablePush(userId: string): Promise<PushStatus> {
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'off';
}
