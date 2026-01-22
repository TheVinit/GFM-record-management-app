import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ;
// Fallback key for development convenience (WARNING: Remove in production)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});