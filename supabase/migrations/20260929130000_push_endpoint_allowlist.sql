-- Only accept endpoints of the real push services (Chrome/Edge/Opera/Samsung
-- via FCM, Firefox, Windows WNS, Safari/iOS). Users insert these rows
-- themselves and the send-push-alerts function POSTs to them, so any other
-- URL would be an SSRF vector. The function applies the same allowlist.
DELETE FROM public.push_subscriptions
WHERE endpoint !~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)/'
   OR length(endpoint) > 2048;

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_allowed CHECK (
    endpoint ~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)/'
    AND length(endpoint) <= 2048
  );
