const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('--- Checking Admin Profile ---');
    const { data: admins, error: adminError } = await supabase.from('profiles').select('*').eq('role', 'admin').limit(1);
    if (adminError) console.error('Admin Fetch Error:', adminError);
    else console.log('Admin found:', JSON.stringify(admins, null, 2));

    console.log('\n--- Testing SignUp for teacher28fixed@test.com ---');
    // Attempting to see the raw error object from Supabase regarding the "invalid email"
    const { data, error } = await supabase.auth.signUp({
        email: 'teacher28fixed@test.com',
        password: 'password123'
    });

    if (error) {
        console.error('SignUp Error Detail:', JSON.stringify(error, null, 2));
    } else {
        console.log('SignUp Success (this shouldn\'t happen if it\'s truly invalid):', data);
    }
}
test();
