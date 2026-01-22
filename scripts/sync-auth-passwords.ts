
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

async function syncPasswords() {
  console.log('🔄 Starting password sync from profiles to auth.users...');
  
  // 1. Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, password');

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found.');
    return;
  }

  // 2. Sync each user
  for (const profile of profiles) {
    if (!profile.email || !profile.password) {
      console.log(`⚠️ Skipping user ${profile.id}: missing email or password`);
      continue;
    }

    console.log(`Syncing user: ${profile.email}`);
    
    // Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = users?.find(u => u.email === profile.email);

    if (existingAuthUser) {
      // Update existing user
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { 
          password: profile.password,
          email_confirm: true 
        }
      );
      if (updateError) {
        console.error(`❌ Error updating ${profile.email}:`, updateError.message);
      } else {
        console.log(`✅ Updated password for ${profile.email}`);
      }
    } else {
      // Create missing user in auth.users with the SAME ID as profile
      const { error: createError } = await supabase.auth.admin.createUser({
        id: profile.id,
        email: profile.email,
        password: profile.password,
        email_confirm: true
      });
      if (createError) {
        console.error(`❌ Error creating ${profile.email}:`, createError.message);
      } else {
        console.log(`✅ Created auth user for ${profile.email}`);
      }
    }
  }
  
  console.log('🏁 Password sync complete.');
}

syncPasswords();
