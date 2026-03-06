import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

const getSupabaseConfig = () => {
  // Direct project URL — never use a proxy so auth tokens are valid for Edge Functions
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, projectUrl: envUrl, key: envKey };
  }

  // Constants fallback (for native/EAS builds)
  const extra = Constants.expoConfig?.extra ||
    (Constants as any).manifest2?.extra?.expoClient?.extra ||
    (Constants as any).manifest?.extra;

  const nativeUrl = extra?.supabaseUrl || '';
  const nativeKey = extra?.supabaseAnonKey || '';

  return { url: nativeUrl, projectUrl: nativeUrl, key: nativeKey };
};

const config = getSupabaseConfig();

export const supabaseUrl = config.url;
export const supabaseProjectUrl = config.projectUrl;
export const supabaseAnonKey = config.key;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase URL or Anon Key is missing! Check environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const checkSupabaseHealth = async () => {
  const hasUrl = !!supabaseUrl;
  const hasKey = !!supabaseAnonKey;
  let connectionOk = false;
  let errorMessage = '';

  if (hasUrl && hasKey) {
    try {
      // Use a lightweight health check
      const { error, status } = await supabase.from('profiles').select('id').limit(1);

      if (!error) {
        connectionOk = true;
      } else {
        errorMessage = error.message;
        // If it's a 401/403, it's actually "connected" but unauthorized
        if (error.code === 'PGRST301' || status === 401 || status === 403) {
          connectionOk = true;
          errorMessage = 'Connected (Auth Required)';
        }
      }
    } catch (e: any) {
      if (e.message?.includes('Failed to fetch')) {
        errorMessage = 'Network Blocked or CORS Error (Failed to fetch)';
      } else {
        errorMessage = e.message || 'Unknown Network Error';
      }
    }
  }

  return {
    hasUrl,
    hasKey,
    connectionOk,
    errorMessage,
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'None',
    source: 'Direct',
    isProxied: false
  };
};

export const uploadToSupabase = async (uri: string, bucket: string) => {
  try {
    const fileName = uri.split('/').pop() || `${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    const fileExt = fileName.split('.').pop();
    const filePath = `${Date.now()}.${fileExt}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
};

export const checkSupabaseConnectivity = async (): Promise<{ ok: boolean; message?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Unknown error' };
  }
};
