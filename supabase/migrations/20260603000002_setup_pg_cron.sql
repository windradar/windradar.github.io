-- Configure pg_cron jobs for automatic wind alerts (email + WhatsApp)
--
-- PREREQUISITES — do this before running the SQL:
--   1. Supabase Dashboard > Database > Extensions
--        Enable "pg_cron"   (search: cron)
--        Enable "pg_net"    (search: net)
--   2. Supabase Dashboard > Edge Functions > send-forecast-email > Secrets
--        CRON_SECRET = <any random string, generate with: openssl rand -hex 32>
--   3. Supabase Dashboard > Edge Functions > send-whatsapp-alerts > Secrets
--        CRON_SECRET = <same random string>
--   4. Replace the two occurrences of <CRON_SECRET> below with that value
--
-- Then run the whole file in: Supabase Dashboard > SQL Editor
--
-- To verify jobs were created:
--   SELECT jobname, schedule, active FROM cron.job;
--
-- To remove a job if needed:
--   SELECT cron.unschedule('windradar-forecast-email');
--   SELECT cron.unschedule('windradar-whatsapp-alerts');

SELECT cron.schedule(
  'windradar-forecast-email',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url     := 'https://iooyyrsrnlbuyxvquxbu.supabase.co/functions/v1/send-forecast-email',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <CRON_SECRET>"}'::jsonb,
    body    := '{}'::jsonb
  );
  $job$
);

-- Staggered 5 min after email to avoid simultaneous load
SELECT cron.schedule(
  'windradar-whatsapp-alerts',
  '5 * * * *',
  $job$
  SELECT net.http_post(
    url     := 'https://iooyyrsrnlbuyxvquxbu.supabase.co/functions/v1/send-whatsapp-alerts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <CRON_SECRET>"}'::jsonb,
    body    := '{}'::jsonb
  );
  $job$
);
