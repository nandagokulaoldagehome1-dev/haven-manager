-- Add drive_file_id column to documents table for better Google Drive file management
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS drive_file_id text;

-- Add index for drive_file_id for faster lookups during deletion
CREATE INDEX IF NOT EXISTS idx_documents_drive_file_id ON public.documents(drive_file_id);