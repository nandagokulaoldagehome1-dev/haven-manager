-- Schedule daily reminder generation at 6 AM UTC
SELECT cron.schedule(
  'generate-reminders-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://geimemclslezirwtuvkh.supabase.co/functions/v1/generate-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaW1lbWNsc2xlemlyd3R1dmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NjY5NjgsImV4cCI6MjA4MTQ0Mjk2OH0.dWGZueJhGe_X7q0SH8I8Mm2c_XDI60liuicxjSKn7Ec"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);