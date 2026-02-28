
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyCollision() {
    console.log('--- Verifying Collision Handling ---');

    try {
        // 1. Get an Admin Token
        const { data: authData } = await supabase.auth.signInWithPassword({
            email: 'admin@test.com',
            password: 'ADMIN123'
        });
        const token = authData.session.access_token;

        const testPrn = 'COLLISION_TEST_001';
        const testEmail = 'collision_test@test.com';

        // 2. Add User First Time
        console.log('2. Adding user first time...');
        const res1 = await supabase.functions.invoke('admin-create-user', {
            headers: { Authorization: `Bearer ${token}` },
            body: {
                email: testEmail,
                password: 'password123',
                role: 'teacher',
                profileData: { prn: testPrn, full_name: 'Collision Test User', department: 'CSE' }
            }
        });
        console.log('   First add result:', res1.data?.message || res1.data?.error);

        // 3. Add User Second Time (different name/password)
        console.log('3. Adding user second time (same PRN/Email)...');
        const res2 = await supabase.functions.invoke('admin-create-user', {
            headers: { Authorization: `Bearer ${token}` },
            body: {
                email: testEmail,
                password: 'new_password_456',
                role: 'teacher',
                profileData: { prn: testPrn, full_name: 'Updated Collision User', department: 'IT' }
            }
        });

        console.log('   Second add result raw data:', JSON.stringify(res2.data, null, 2));
        console.log('   Second add result raw error:', JSON.stringify(res2.error, null, 2));

        if (res2.data?.error || res2.error) {
            console.error('   Collision Second Add Failed (Expected/Unexpected):', res2.data?.error || res2.error);
        } else {
            console.log('   Collision Second Add Success:', res2.data?.message);

            // Verify final state in DB
            const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('prn', testPrn).single();
            console.log('   Final Profile Name:', profile.full_name);
            console.log('   Final Profile Dept:', profile.department);

            if (profile.full_name === 'Updated Collision User' && profile.department === 'IT') {
                console.log('   ✅ Collision handled and data updated successfully.');
            } else {
                console.error('   ❌ Profile data was NOT updated correctly.');
            }
        }

        // 4. Cleanup
        console.log('4. Cleaning up...');
        await supabaseAdmin.from('profiles').delete().eq('prn', testPrn);
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const userToDelete = usersData.users.find(u => u.email === testEmail);
        if (userToDelete) await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
        console.log('   Cleanup complete.');

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verifyCollision();
