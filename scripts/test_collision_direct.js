
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function testCollision() {
    console.log('--- Direct Collision Test ---');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        const { data: authData } = await supabase.auth.signInWithPassword({
            email: 'admin@test.com',
            password: 'ADMIN123'
        });
        const token = authData.session.access_token;

        const call = async (payload) => {
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const text = await resp.text();
            console.log(`Status: ${resp.status}`);
            try { return JSON.parse(text); } catch { return text; }
        };

        const testPrn = 'DIRECT_COLLISION_001';
        const testEmail = 'direct_coll@test.com';

        console.log('1. First call (Create)...');
        const res1 = await call({
            email: testEmail,
            password: 'password123',
            role: 'teacher',
            profileData: { prn: testPrn, full_name: 'Test 1', department: 'CSE' }
        });
        console.log('Result 1:', JSON.stringify(res1, null, 2));

        console.log('2. Second call (Update)...');
        const res2 = await call({
            email: testEmail,
            password: 'new_password_456',
            role: 'teacher',
            profileData: { prn: testPrn, full_name: 'Updated Name', department: 'IT' }
        });
        console.log('Result 2:', JSON.stringify(res2, null, 2));

    } catch (e) {
        console.error('Test script error:', e);
    }
}

testCollision();
