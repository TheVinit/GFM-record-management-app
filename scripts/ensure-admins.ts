import { supabaseAdmin } from '../services/supabase-admin';

async function ensureAdmins() {
  console.log('🚀 Synchronizing Admin Users and Profiles...');

    const admins = [
      { email: 'admin@test.com', password: 'ADMIN123', name: 'System Admin' },
      { email: 'admin1@test.com', password: 'ADMIN123', name: 'Admin User' }
    ];

    for (const admin of admins) {
      console.log(`\nChecking admin: ${admin.email}`);

      // 1. Get or Create User in Auth
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      let authUser = users.find(u => u.email === admin.email);

      if (!authUser) {
        console.log(`- Creating auth user: ${admin.email}`);
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: admin.email,
          password: admin.password,
          email_confirm: true,
          user_metadata: { role: 'admin', full_name: admin.name }
        });
        if (createError) {
          console.error(`- Error creating auth user: ${createError.message}`);
          continue;
        }
        authUser = createData.user;
        console.log(`- Auth user created: ${authUser.id}`);
      } else {
        console.log(`- Updating password for: ${admin.email}`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          password: admin.password
        });
        if (updateError) {
          console.error(`- Error updating password: ${updateError.message}`);
        } else {
          console.log(`- Password updated successfully`);
        }
      }

      // 2. Ensure Profile exists
      console.log(`- Syncing profile for: ${admin.email}`);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: admin.email,
          role: 'admin',
          password: admin.password,
          full_name: admin.name
        });

    if (profileError) {
      console.error(`- Error syncing profile: ${profileError.message}`);
    } else {
      console.log(`- Profile synchronized successfully`);
    }
  }

  console.log('\n✅ All admin accounts are synchronized.');
}

ensureAdmins().catch(err => {
  console.error('❌ Critical error during synchronization:', err);
  process.exit(1);
});
