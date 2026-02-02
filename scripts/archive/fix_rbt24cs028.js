
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUser() {
    console.log('--- Fixing User rbt24cs028 via Auth ---');

    const prn = 'rbt24cs028';
    const email = 'rbt24cs028@gfm.com';
    const password = 'student123'; // Stronger
    const fullName = 'Student rbt24cs028';

    // 1. Authenticate
    console.log('Attempting Login...');
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.log('Login failed (' + authError.message + '), trying SignUp...');
        const { data: signData, error: signError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    prn: prn,
                    role: 'student',
                    full_name: fullName
                }
            }
        });

        if (signError) {
            console.error('SignUp Error:', signError);
            return;
        }
        authData = signData;
        console.log('SignUp Successful.');
    } else {
        console.log('Login Successful.');
    }

    if (!authData?.user) {
        console.error('No user session.');
        return;
    }

    // 2. Insert/Update Profile (Authenticated)
    console.log('Upserting Profile...');
    const { error: pError } = await supabase
        .from('profiles')
        .upsert({
            id: authData.user.id, // Important: Match Auth ID
            prn: prn,
            email: email,
            full_name: fullName,
            role: 'student',
            password: password,
            first_login: true
        }, { onConflict: 'id' });

    if (pError) console.error('Profile Upsert Error:', pError);
    else console.log('Profile Upserted.');

    // 3. Insert Student Record (might fail if RLS blocks)
    console.log('Upserting Student Record...');
    const { error: sError } = await supabase
        .from('students')
        .upsert({
            prn: prn,
            roll_no: '24028',
            full_name: fullName,
            email: email,
            branch: 'Computer Engineering',
            year_of_study: 'Second Year',
            division: 'A',
            verification_status: 'Pending'
        }, { onConflict: 'prn' });

    if (sError) console.error('Student Upsert Error:', sError);
    else console.log('Student Record Upserted.');

    console.log('--- Fix Complete ---');
}

fixUser();
