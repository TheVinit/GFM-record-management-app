import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Admin User';

if (!email || !password) {
  console.log("=========================================");
  console.log("Usage: npx ts-node scripts/create_admin.ts <email> <password> [\"Full Name\"]");
  console.log("Example:");
  console.log("  npx ts-node scripts/create_admin.ts newadmin@gfm.com Admin@123 \"John Admin\"");
  console.log("=========================================");
  process.exit(1);
}

const prn = email.split('@')[0].toUpperCase(); // default PRN to email prefix

async function setup() {
  console.log(`🚀 Creating admin user: ${email}...`);

  // 1. Create user in auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' }, // Set secure role in JWT
    user_metadata: { role: 'admin', full_name: fullName }
  });

  let userId = '';

  if (userError) {
    if (userError.message.includes('already registered')) {
      console.log('✅ Admin user already exists in Auth. Updating Role...');
      // Try to find the user
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existingUser = users.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;

        // Ensure role and password are set correctly
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password,
          app_metadata: { role: 'admin' }
        });
      }
    } else {
      console.error('❌ Error creating user:', userError);
      process.exit(1);
    }
  } else {
    console.log('✅ Admin user created in Auth:', userData.user.id);
    userId = userData.user.id;
  }

  // 2. Create Profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      prn,
      email,
      role: 'admin',
      full_name: fullName,
      is_profile_complete: true
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('❌ Error creating profile in database:', profileError);
  } else {
    console.log('🎉 Awesome! Admin profile created and ready.');
    console.log('You can now log in with:');
    console.log(`Username: ${email}`);
    console.log(`Password: ${password}`);
  }
}

setup().catch(console.error);
