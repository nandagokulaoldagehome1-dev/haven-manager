-- Set up Supabase configuration variables for use in scheduled jobs
-- These variables will be accessible via current_setting() in migrations and functions

-- Set the Supabase URL
ALTER SYSTEM SET app.settings.supabase_url = 'https://geimemclslezirwtuvkh.supabase.co';

-- Set the Supabase Anon Key (PUBLISHABLE_KEY)
ALTER SYSTEM SET app.settings.anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaW1lbWNsc2xlemlyd3R1dmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NjY5NjgsImV4cCI6MjA4MTQ0Mjk2OH0.dWGZueJhGe_X7q0SH8I8Mm2c_XDI60liuicxjSKn7Ec';

-- Reload the configuration to apply the changes
SELECT pg_reload_conf();
