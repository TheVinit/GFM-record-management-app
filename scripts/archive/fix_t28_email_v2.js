const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixEmail() {
    console.log('--- Updating Teacher 28 Email in Profiles ---');

    // 1. Update email to something guaranteed unique and clean
    const newEmail = 'teacher28@gfmrecord.com';
    const { data, error } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('prn', '28');

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log(`Successfully updated Teacher 28 email to: ${newEmail}`);

        // 2. Try to signUp in Auth with the NEW email
        console.log('--- Attempting Auth SignUp with New Email ---');
        const { data: sData, error: sError } = await supabase.auth.signUp({
            email: newEmail,
            password: '123456',
            options: {
                data: { prn: '28', role: 'teacher' }
            }
        });

        if (sError) {
            console.error('Auth SignUp Error:', sError.message);
        } else {
            console.log('Auth SignUp SUCCEEDED for:', newEmail);
        }
    }
}

fixEmail();
