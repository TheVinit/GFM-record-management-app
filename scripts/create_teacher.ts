import { supabaseAdmin } from '../services/supabase-admin';

async function setup() {
  console.log('🚀 Creating teacher user...');
  
    const email = 'teacher1@test.com';
    const password = 'password123';
    const facultyPassword = 'password123';
    
    // 1. Create user in auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'teacher', full_name: 'Teacher One' }
    });
  
    if (userError) {
      if (userError.message.includes('already registered')) {
        console.log('✅ Teacher user already exists in Auth');
        // Try to find the user
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = users.users.find(u => u.email === email);
        if (existingUser) {
          await createProfile(existingUser.id, email, facultyPassword);
        }
      } else {
        console.error('❌ Error creating user:', userError);
      }
    } else {
      console.log('✅ Teacher user created in Auth:', userData.user.id);
      await createProfile(userData.user.id, email, facultyPassword);
    }
  }
  
  async function createProfile(id: string, email: string, facultyPassword: string) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id,
        email,
        role: 'teacher',
        password: facultyPassword,
        full_name: 'Teacher One'
      });

  if (profileError) {
    console.error('❌ Error creating profile:', profileError);
  } else {
    console.log('✅ Teacher profile created/updated');
  }
}

setup().catch(console.error);
