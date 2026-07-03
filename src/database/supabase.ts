import { createClient } from '@supabase/supabase-js';
import { db } from './db';

// Retrieve saved configuration from local storage
const config = db.getSupabaseConfig();

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
