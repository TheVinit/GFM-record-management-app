
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables (VITE_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log('🌱 Starting database seeding...');

  const testAccounts = [
    {
      email: 'admin@test.com',
      password: 'ADMIN123',
      role: 'admin',
      full_name: 'System Admin'
    },
    {
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      full_name: 'John Professor'
    },
    {
      email: 'student2024@test.com',
      password: 'password123',
      role: 'student',
      prn: '2024STUDENT1',
      full_name: 'Alice Student'
    }
  ];

  for (const account of testAccounts) {
    console.log(`\n👤 Processing ${account.role}: ${account.email}`);

    // 1. Auth User
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    let user = users?.find(u => u.email === account.email);

    if (user) {
      console.log(`   Updating existing auth user: ${user.id}`);
      await supabase.auth.admin.updateUserById(user.id, {
        password: account.password,
        email_confirm: true
      });
    } else {
      console.log(`   Creating new auth user...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true
      });
      if (createError) {
        console.error(`   ❌ Auth creation failed:`, createError.message);
        continue;
      }
      user = newUser.user;
    }

    if (!user) continue;

    // 2. Profile
    console.log(`   Upserting profile...`);
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: account.email,
        role: account.role,
        full_name: account.full_name,
        password: account.password,
        prn: account.prn || null,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error(`   ❌ Profile upsert failed:`, profileError.message);
    }

    console.log('\n✅ Seeding complete! You can now log in with:');
    console.log('Admin   -> ID: admin@test.com, Pass: ADMIN123');
    console.log('Teacher -> ID: teacher@test.com, Pass: password123');
    console.log('Student -> ID: 2024STUDENT1, Pass: password123');

  }

}

seed();
