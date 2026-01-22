import { supabaseAdmin } from '../services/supabase-admin';

async function seedStudent() {
  const prn = '2024STUDENT1';
  const email = 'email@gmail.com';
  const password = '123';
  const fullName = 'vinittalele';

  console.log(`🚀 Seeding student: ${prn} (${email})...`);

  // 1. Create user in auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', full_name: fullName }
  });

  if (userError) {
    if (userError.message.includes('already registered')) {
      console.log('✅ Student user already exists in Auth');
      // Just update profile
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.users.find(u => u.email === email);
      if (existingUser) await createProfile(existingUser.id, email, prn, fullName);
    } else {
      console.error('❌ Error creating student user:', userError);
    }
  } else {
    console.log('✅ Student user created in Auth:', userData.user.id);
    await createProfile(userData.user.id, email, prn, fullName);
  }
}

async function createProfile(id: string, email: string, prn: string, fullName: string) {
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id,
      email,
      role: 'student',
      prn,
      full_name: fullName
    });

  if (profileError) {
    console.error('❌ Error creating student profile:', profileError);
  } else {
    console.log('✅ Student profile created/updated');
  }
}

seedStudent().catch(console.error);
