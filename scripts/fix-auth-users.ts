
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUsers() {
  const users = [
    { email: 'admin1@test.com', password: 'password123' },
    { email: 'teacher1@test.com', password: 'password123' },
    { email: 'student1@test.com', password: 'password123' }
  ];

  for (const user of users) {
    console.log(`Fixing user: ${user.email}`);
    
    // 1. Get user ID
    const { data: { users: foundUsers }, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = foundUsers?.find(u => u.email === user.email);

    if (existingUser) {
      console.log(`Updating password for ${user.email}`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: user.password, email_confirm: true }
      );
      if (updateError) console.error(`Error updating ${user.email}:`, updateError);
    } else {
      console.log(`Creating user ${user.email}`);
      const { error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });
      if (createError) console.error(`Error creating ${user.email}:`, createError);
    }
  }
}

fixUsers();
