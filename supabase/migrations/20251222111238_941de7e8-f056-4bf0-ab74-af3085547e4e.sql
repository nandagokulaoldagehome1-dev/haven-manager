-- Add root_folder_id column to store the auto-created Drive folder
ALTER TABLE public.google_drive_config ADD COLUMN IF NOT EXISTS root_folder_id text;