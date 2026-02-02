const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('🔍 Checking PRN 28 profile...');
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('prn', '28')
        .maybeSingle();

    if (error) {
        console.error('❌ Error fetching profile:', error.message);
        return;
    }

    if (!profile) {
        console.log('❌ Profile not found for PRN 28.');
        return;
    }

    console.log('✅ Profile found:', JSON.stringify(profile, null, 2));

    console.log(`🔑 Attempting manual login with email: [${profile.email}] and password: [${profile.password}]`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email.trim(),
        password: profile.password
    });

    if (authError) {
        console.error('❌ Auth login failed:', authError.message);

        console.log('📡 Attempting rescue signUp logic...');
        const fallbackEmail = `teacher28fixed@test.com`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: fallbackEmail,
            password: profile.password
        });

        if (signUpError) {
            console.error('❌ Rescue signUp failed:', signUpError.message);
        } else {
            console.log('✅ Rescue signUp successful! New Email:', fallbackEmail);
        }
    } else {
        console.log('✅ Auth login successful! Session ID:', authData.session.user.id);
    }
}

check();
