-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table to store admin's Google OAuth tokens (only one row needed)
CREATE TABLE public.google_drive_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamp with time zone NOT NULL,
  user_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_config ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage this config
CREATE POLICY "Super admins can manage google_drive_config"
ON public.google_drive_config
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_google_drive_config_updated_at
BEFORE UPDATE ON public.google_drive_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();