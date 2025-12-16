import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geimemclslezirwtuvkh.supabase.co';
// Get your anon key from Supabase Dashboard > Settings > API > anon public key
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

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
