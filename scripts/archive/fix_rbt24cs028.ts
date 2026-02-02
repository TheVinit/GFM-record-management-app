
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUser() {
    console.log('--- Fixing User rbt24cs028 ---');

    const prn = 'rbt24cs028';
    const email = 'rbt24cs028@gfm.com'; // Inferred email
    const fullName = 'Student rbt24cs028';

    // 1. Check/Insert Profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('prn', prn)
        .maybeSingle();

    if (pError) console.error('Profile Check Error:', pError);

    if (!profile) {
        console.log('Creating Profile...');
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                prn: prn,
                email: email,
                full_name: fullName,
                role: 'student',
                password: '123', // Default password
                first_login: true
            });
        if (insertError) console.error('Profile Insert Error:', insertError);
        else console.log('Profile Created.');
    } else {
        console.log('Profile already exists.');
    }

    // 2. Check/Insert Student Record
    const { data: student, error: sError } = await supabase
        .from('students')
        .select('*')
        .eq('prn', prn)
        .maybeSingle();

    if (sError) console.error('Student Check Error:', sError);

    if (!student) {
        console.log('Creating Student Record...');
        const { error: sInsertError } = await supabase
            .from('students')
            .insert({
                prn: prn,
                roll_no: '24028', // Inferred Roll No
                full_name: fullName,
                email: email,
                branch: 'Computer Engineering', // Default
                year_of_study: 'Second Year', // Default
                division: 'A', // Default
                verification_status: 'Pending'
            });
        if (sInsertError) console.error('Student Insert Error:', sInsertError);
        else console.log('Student Record Created.');
    } else {
        console.log('Student Record already exists.');
    }

    console.log('--- Fix Complete ---');
}

fixUser();
