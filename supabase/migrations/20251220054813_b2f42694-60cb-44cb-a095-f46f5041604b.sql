-- Schedule daily reminder generation at 6 AM UTC
-- Uses the SUPABASE_ANON_KEY from environment variables
SELECT cron.schedule(
  'generate-reminders-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-reminders',
    headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.anon_key') || '"}')::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);