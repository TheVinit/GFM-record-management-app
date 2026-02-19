import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const getEnvVar = (key: string): string => {
  // Try process.env (Node/Metro)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  // Try EXPO_PUBLIC prefix if not found
  if (!key.startsWith('EXPO_PUBLIC_')) {
    const expoKey = `EXPO_PUBLIC_${key}`;
    if (typeof process !== 'undefined' && process.env && process.env[expoKey]) {
      return process.env[expoKey] as string;
    }
  }

  // Try globalThis (Expo injected)
  if (typeof globalThis !== 'undefined' && (globalThis as any).__EXPO_ENV__?.[key]) {
    return (globalThis as any).__EXPO_ENV__[key];
  }

  // Fallback for common Vite prefixes in .env
  const viteKey = key.replace('EXPO_PUBLIC_', 'VITE_');
  if (typeof process !== 'undefined' && process.env && process.env[viteKey]) {
    return process.env[viteKey] as string;
  }

  return '';
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL').trim();
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY').trim();

if (typeof window !== 'undefined') {
  console.log('🔌 [Supabase] Connection Host:', supabaseUrl.split('//')[1]?.split('.')[0] || 'none');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL or Anon Key is missing in environment variables!");
  console.log("Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
