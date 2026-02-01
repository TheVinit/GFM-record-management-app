const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncAll() {
    console.log('🔄 Starting full user sync to Supabase Auth...');

    // 1. Fetch all profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, prn, role, email, password, full_name');

    if (pError) {
        console.error('❌ Error fetching profiles:', pError);
        return;
    }

    console.log(`📡 Found ${profiles.length} profiles to sync.`);

    for (const profile of profiles) {
        // Standardize email: ensure no spaces, lowercase
        // We use @gfmadmin.com as a guaranteed "clean" domain
        const prnClean = (profile.prn || profile.id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanEmail = (profile.email || `${profile.role}${prnClean}@gfm.com`).toLowerCase().trim();
        const password = profile.password || profile.prn || 'password123';

        console.log(`Syncing [${profile.role}] PRN: ${profile.prn} -> Email: ${cleanEmail}`);

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
                data: {
                    full_name: profile.full_name,
                    role: profile.role,
                    prn: profile.prn
                }
            }
        });

        if (signUpError) {
            if (signUpError.message.includes('already registered')) {
                console.log(`ℹ️  [${profile.prn}] Already exists in Auth. Skipping.`);
            } else {
                console.error(`❌ [${profile.prn}] SignUp failed:`, signUpError.message);
            }
        } else {
            console.log(`✅ [${profile.prn}] Successfully added to Supabase Auth.`);
        }
    }

    console.log('\n🏁 Sync complete. Please run the SQL commands provided earlier to confirm all emails if you haven\'t already.');
}

syncAll();
