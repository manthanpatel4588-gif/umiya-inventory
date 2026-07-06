import { createClient } from '@supabase/supabase-js';

// Read directly from Environment Variables first, fallback to LocalStorage
const getSupabaseConfig = () => {
  // 1. Read from build-time environment variables (e.g. Vercel dashboard variables)
  // This automatically connects all devices out-of-the-box!
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey };
  }

  // 2. Fallback to device-specific LocalStorage configuration
  const config = localStorage.getItem('umiya_supabase_config');
  return config ? JSON.parse(config) : { url: '', key: '' };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = (): boolean => {
  return !!(config.url && config.key);
};

// Create the Supabase client if configured, otherwise null
export const supabase = isSupabaseConfigured()
  ? createClient(config.url, config.key)
  : null;

// A helper to describe the current database mode
export const getDatabaseMode = (): { type: 'local' | 'supabase'; label: string; labelGu: string } => {
  if (isSupabaseConfigured()) {
    return {
      type: 'supabase',
      label: 'Supabase Cloud Active',
      labelGu: 'સુપબેઝ ક્લાઉડ એક્ટિવ'
    };
  }
  return {
    type: 'local',
    label: 'Offline (LocalStorage)',
    labelGu: 'ઓફલાઇન મોડ (લોકલ સ્ટોરેજ)'
  };
};
