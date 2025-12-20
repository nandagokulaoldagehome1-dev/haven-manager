-- Create table for resident extra charges
CREATE TABLE public.resident_extra_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL,
  date_charged DATE NOT NULL DEFAULT CURRENT_DATE,
  month_year TEXT NOT NULL,
  is_billed BOOLEAN DEFAULT false,
  payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resident_extra_charges ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can manage resident_extra_charges"
ON public.resident_extra_charges
FOR ALL
USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_resident_extra_charges_resident ON public.resident_extra_charges(resident_id);
CREATE INDEX idx_resident_extra_charges_month ON public.resident_extra_charges(month_year);
CREATE INDEX idx_resident_extra_charges_unbilled ON public.resident_extra_charges(resident_id, is_billed) WHERE is_billed = false;