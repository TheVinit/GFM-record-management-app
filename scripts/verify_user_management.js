
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyUserManagement() {
    console.log('--- Verifying User Management ---');

    try {
        // 1. Get an Admin Token (using admin@test.com)
        console.log('1. Signing in as Admin...');
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'admin@test.com',
            password: 'ADMIN123'
        });

        if (signInError) throw new Error(`Sign in failed: ${signInError.message}`);
        const token = authData.session.access_token;
        console.log('   Admin signed in successfully.');

        // 2. Test Adding a Student
        const testStudentPrn = 'TEST_STUDENT_999';
        console.log(`2. Testing Add Student: ${testStudentPrn}...`);
        const { data: studentResult, error: studentInvokeError } = await supabase.functions.invoke('admin-create-user', {
            headers: { Authorization: `Bearer ${token}` },
            body: {
                email: 'test_student_999@test.com',
                password: testStudentPrn,
                role: 'student',
                profileData: {
                    prn: testStudentPrn,
                    full_name: 'Test Student 999',
                    department: 'CSE'
                },
                studentData: {
                    phone: '1234567890',
                    roll_no: '999',
                    branch: 'CSE',
                    year_of_study: 'TE',
                    division: 'A'
                }
            }
        });

        if (studentInvokeError || studentResult?.error) {
            console.error('   Student Add Failed:', studentInvokeError?.message || studentResult?.error);
        } else {
            console.log('   Student Added Successfully:', JSON.stringify(studentResult, null, 2));
        }

        // 3. Test Adding a Faculty Member
        const testFacultyPrn = 'TEST_FACULTY_999';
        console.log(`3. Testing Add Faculty: ${testFacultyPrn}...`);
        const { data: facultyResult, error: facultyInvokeError } = await supabase.functions.invoke('admin-create-user', {
            headers: { Authorization: `Bearer ${token}` },
            body: {
                email: 'test_faculty_999@teacher.com',
                password: testFacultyPrn,
                role: 'teacher',
                profileData: {
                    prn: testFacultyPrn,
                    full_name: 'Test Faculty 999',
                    department: 'CSE'
                }
            }
        });

        if (facultyInvokeError || facultyResult?.error) {
            console.error('   Faculty Add Failed:', facultyInvokeError?.message || facultyResult?.error);
        } else {
            console.log('   Faculty Added Successfully:', JSON.stringify(facultyResult, null, 2));
        }

        // 4. Cleanup: Delete test records
        console.log('4. Cleaning up test records...');
        await supabaseAdmin.from('profiles').delete().in('prn', [testStudentPrn, testFacultyPrn]);
        await supabaseAdmin.from('students').delete().eq('prn', testStudentPrn);

        // delete auth users
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const testEmails = ['test_student_999@test.com', 'test_faculty_999@teacher.com'];
        const usersToDelete = usersData.users.filter(u => testEmails.includes(u.email));
        for (const user of usersToDelete) {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
        }
        console.log('   Cleanup complete.');

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verifyUserManagement();
