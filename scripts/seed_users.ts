import { supabaseAdmin } from '../services/supabase-admin';

async function seedUsers() {
    const users = [
      { email: 'student2024@test.com', password: 'password123', role: 'student', prn: '2024STUDENT1', fullName: 'Alice Student' },
      { email: 'teacher@test.com', password: 'password123', role: 'teacher', fullName: 'John Professor' },
      { email: 'admin@test.com', password: 'ADMIN123', role: 'admin', fullName: 'System Admin' }
    ];

    for (const user of users) {
      console.log(`Processing user: ${user.email}`);
      
      // Check if user exists in auth
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError);
        return;
      }

      let authUser = authUsers.users.find(u => u.email === user.email);

      if (!authUser) {
        console.log(`Creating auth user: ${user.email}`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true
        });
        if (createError) {
          console.error(`Error creating user ${user.email}:`, createError);
          continue;
        }
        authUser = newUser.user;
      } else {
        console.log(`Updating auth user password: ${user.email}`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          password: user.password
        });
        if (updateError) {
          console.error(`Error updating user ${user.email}:`, updateError);
        }
      }

      if (authUser) {
        console.log(`Upserting profile for: ${user.email}`);
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: user.email,
            role: user.role,
            prn: user.prn || null,
            password: user.password,
            full_name: user.fullName,
            updated_at: new Date().toISOString()
          });
      
      if (profileError) {
        console.error(`Error upserting profile for ${user.email}:`, profileError);
      } else {
        console.log(`✅ User ${user.email} ready.`);
      }
    }
  }
}

seedUsers();
