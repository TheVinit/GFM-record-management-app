const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceUpdate() {
    console.log('--- Force Updating Teacher 28 Auth ---');

    // 1. Get profile data
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, email, password')
        .eq('prn', '28')
        .single();

    if (pError || !profile) {
        console.error('Profile Fetch Error:', pError);
        return;
    }

    console.log(`Profile Found: ID=${profile.id}, Email=${profile.email}, DB_Pass=${profile.password}`);

    // 2. Attempt to sign up if doesn't exist (this is safe as per our flow)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: profile.email,
        password: profile.password,
        options: {
            data: {
                prn: '28',
                role: 'teacher'
            }
        }
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) {
            console.log('User already exists in Auth. Migration needed but cannot be done without service key.');
            console.log('Trying to sign in with DB_Pass...');
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: profile.password
            });
            if (signInError) {
                console.error('SignIn with DB_Pass failed:', signInError.message);
            } else {
                console.log('SignIn with DB_Pass SUCCEEDED. The issue might be intermittent or cached.');
            }
        } else {
            console.error('SignUp Error:', signUpError.message);
        }
    } else {
        console.log('Successfully added Teacher 28 to Auth with password:', profile.password);
    }
}

forceUpdate();
