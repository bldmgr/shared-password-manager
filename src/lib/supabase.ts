import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedPassword {
  id: string;
  service_name: string;
  service_url?: string;
  username?: string;
  password?: string;
  token?: string;
  description?: string;
  expiration_date?: string;
  two_factor_enabled: boolean;
  environment: 'dev' | 'qa' | 'prod';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SharedTextFile {
  id: string;
  title: string;
  content: string;
  description?: string;
  file_type: string;
  environment: 'dev' | 'qa' | 'prod';
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action_type: 'login' | 'password_access' | 'password_reveal' | 'text_file_access';
  resource_id?: string;
  resource_name?: string;
  metadata: {
    user_agent?: string;
    ip_address?: string;
    [key: string]: any;
  };
  created_at: string;
}
