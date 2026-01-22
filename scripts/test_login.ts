import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🧪 Testing login for teacher@test.com with password 123456...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'teacher@test.com',
    password: '123456'
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
  } else {
    console.log('✅ Login successful for:', data.user?.email);
    console.log('User ID:', data.user?.id);
  }
}

testLogin();
