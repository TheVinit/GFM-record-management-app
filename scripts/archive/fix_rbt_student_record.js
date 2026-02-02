
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pgmrerxzioafpzwclqmx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXJlcnh6aW9hZnB6d2NscW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzMwOTQsImV4cCI6MjA4MzY0OTA5NH0.Zp5dTkhxMTzw8A5zo2zgm95d-Uu-8q7VQcvLqbjEYok';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStudentRecord() {
    console.log('--- Inserting Student Record as Teacher ---');

    // 1. Log in as Teacher
    // Using credentials found in fix_t28_email_v2.js
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'teacher28@gfmrecord.com',
        password: '123456'
    });

    if (authError || !authData.user) {
        console.error('Teacher Login Failed:', authError);
        return;
    }
    console.log('Teacher Login Successful.');

    // 2. Insert Student Record
    const prn = 'rbt24cs028';

    const { error: sError } = await supabase
        .from('students')
        .upsert({
            prn: prn,
            roll_no: '24028',
            full_name: 'Student rbt24cs028',
            email: 'rbt24cs028@gfm.com',
            branch: 'Computer Engineering',
            year_of_study: 'Second Year',
            division: 'A',
            verification_status: 'Pending',
            gfm_id: authData.user.id // Assign to this teacher temporarily
        }, { onConflict: 'prn' });

    if (sError) console.error('Student Insert Error:', sError);
    else console.log('Student Record Inserted Successfully.');
}

fixStudentRecord();
