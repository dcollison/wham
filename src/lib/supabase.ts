import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve from Vite environment variables or localStorage overrides
const getEnvSupabase = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('wham_supabase_url') || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('wham_supabase_key') || '';
  return { url: url.trim(), key: key.trim() };
};

const { url: envUrl, key: envKey } = getEnvSupabase();

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  envUrl.startsWith('http') &&
  !envUrl.includes('your-project')
);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(envUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Re-initialize supabase client if user configures it dynamically from the UI
 */
export function reconfigureSupabase(url: string, key: string): boolean {
  try {
    if (url && key && url.startsWith('http')) {
      localStorage.setItem('wham_supabase_url', url.trim());
      localStorage.setItem('wham_supabase_key', key.trim());
      supabase = createClient(url.trim(), key.trim(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return true;
    }
  } catch (e) {
    console.error('Failed to configure Supabase:', e);
  }
  return false;
}

/**
 * Upload a compressed photo to the Supabase 'boulder-photos' bucket
 * Falls back to returning base64 dataUrl in offline/demo mode.
 */
export async function uploadBoulderPhoto(
  file: File,
  dataUrlFallback: string,
  boulderId: string
): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    // In demo/offline mode, return compressed dataUrl directly for immediate preview and persistence
    return dataUrlFallback;
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${boulderId}-${Date.now()}.${fileExt}`;
    const filePath = `boulders/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('boulder-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg'
      });

    if (uploadError) {
      console.warn('Supabase storage upload error, falling back to data URL:', uploadError.message);
      return dataUrlFallback;
    }

    const { data } = supabase.storage
      .from('boulder-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Photo upload exception:', err);
    return dataUrlFallback;
  }
}
