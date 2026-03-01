import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

// 🎯 CRITICAL FOR WEB & NATIVE DEPLOYMENT:
// 1. Literal Access: Vercel/Expo Web inlines these ONLY if written out as process.env.KEY
// 2. Constants: EAS/Native builds prefer Constants.expoConfig.extra

const getSupabaseConfig = () => {
  // Try Literal Access (Best for Web/Vercel)
  const webUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const webKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (webUrl && webKey) {
    return { url: webUrl, key: webKey };
  }

  // Try Constants Fallback (Best for Native/EAS)
  const nativeUrl = Constants.expoConfig?.extra?.supabaseUrl;
  const nativeKey = Constants.expoConfig?.extra?.supabaseAnonKey;

  return {
    url: nativeUrl || '',
    key: nativeKey || ''
  };
};

const config = getSupabaseConfig();

export const supabaseUrl = config.url;
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
      const { error } = await supabase.from('profiles').select('id').limit(1);

      if (!error) {
        connectionOk = true;
      } else {
        errorMessage = error.message;
        // If it's a 401/403, it's actually "connected" but unauthorized
        if (error.code === 'PGRST301' || error.status === 401 || error.status === 403) {
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
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'None'
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
