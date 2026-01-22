
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables (EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  console.log('🔄 Resetting password for 2024STUDENT1...');

  // 1. Get user by email
  const email = 'student2024@test.com';
  const newPassword = 'password123';

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const user = users?.find(u => u.email === email);

  if (user) {
    console.log(`✅ Found user: ${user.id}. Updating password to "${newPassword}"...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true
    });

    if (updateError) {
      console.error('❌ Failed to update password:', updateError.message);
    } else {
      console.log('✨ Password updated successfully!');
    }
  } else {
    console.log(`⚠️ User ${email} not found in Auth. Creating now...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });

    if (createError) {
      console.error('❌ Failed to create user:', createError.message);
    } else {
      console.log('✅ User created successfully!');
      
      // Also ensure profile exists
      await supabase.from('profiles').upsert({
        id: newUser.user.id,
        email: email,
        role: 'student',
        prn: '2024STUDENT1',
        full_name: 'Alice Student'
      });
    }
  }
}

resetPassword();
