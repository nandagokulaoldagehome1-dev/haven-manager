import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geimemclslezirwtuvkh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaW1lbWNsc2xlemlyd3R1dmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NjY5NjgsImV4cCI6MjA4MTQ0Mjk2OH0.dWGZueJhGe_X7q0SH8I8Mm2c_XDI60liuicxjSKn7Ec';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}
