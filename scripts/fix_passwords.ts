import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

const users = [
  { id: '0d9bfa2c-cd65-48a8-b1ce-8ef6692b18f0', email: 'admin@test.com' },
  { id: '50f74ca4-012c-4f3d-bc40-5c64a35cc657', email: 'teacher@test.com' },
  { id: 'fe3dfc4c-156d-4bbd-8dd3-93bb29b7afde', email: 'student2024@test.com' }
];

async function resetPasswords() {
  console.log('🚀 Starting password reset to "123456" for all users...');
  for (const user of users) {
    console.log(`Updating ${user.email} (${user.id})...`);
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: '123456'
    });
    if (error) {
      console.error(`❌ Error updating ${user.email}:`, error.message);
    } else {
      console.log(`✅ Successfully updated ${user.email}`);
    }
  }
}

resetPasswords();
