import { createClient } from '@supabase/supabase-js';

// Read directly from LocalStorage to prevent circular dependency with db.ts
const getSupabaseConfig = () => {
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
