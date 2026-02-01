const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixTaker() {
    console.log('--- Fixing Attendance Taker 27 ---');

    const targetPRN = '27';
    const newEmail = 'at27.gfm@gmail.com';

    // 1. Update Profile
    const { error: uError } = await supabase
        .from('profiles')
        .update({ email: newEmail, password: '27' }) // Password matches PRN as per previous output
        .eq('prn', targetPRN);

    if (uError) {
        console.error('Profile Update Failed:', uError.message);
        return;
    }
    console.log(`Profile Updated: PRN=${targetPRN}, Email=${newEmail}, Pass=27`);

    // 2. Auth SignUp
    console.log('--- Attempting Auth SignUp ---');
    const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: '27'
    });

    if (error) {
        if (error.message.includes('already registered')) {
            console.log('Attendance Taker already registered in Auth. Testing SignIn...');
            const { error: siError } = await supabase.auth.signInWithPassword({
                email: newEmail,
                password: '27'
            });
            if (siError) console.error('SignIn Failed:', siError.message);
            else console.log('SignIn SUCCEEDED!');
        } else {
            console.error('Auth Error:', error.message);
        }
    } else {
        console.log('Auth SUCCESS! Attendance Taker 27 is now fully registered.');
    }
}

fixTaker();
