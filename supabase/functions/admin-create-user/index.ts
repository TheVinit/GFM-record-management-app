import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Admin Create User Function Started")

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        // 1. Validate Admin Token
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) throw new Error('Invalid token')
        if (user.app_metadata.role !== 'admin') throw new Error('Unauthorized: Admin only')

        // 2. Parse Request Body
        const { email, password, role, profileData, studentData } = await req.json()

        if (!email || !password || !role || !profileData || !profileData.prn) {
            throw new Error('Missing required fields: email, password, role, profileData, profileData.prn')
        }

        console.log(`Creating user: ${profileData.prn} (${email}) - role: ${role}`)

        // 3. Create Auth User
        const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            app_metadata: { role: role }
        })

        if (createUserError) {
            // If user already exists in auth, just update their role/password
            if (createUserError.message.includes('already exists')) {
                console.log('User already exists in Auth. Updating instead.')

                // find user by email
                const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
                const existingUser = existingUsers?.users?.find(u => u.email === email)

                if (existingUser) {
                    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
                        existingUser.id,
                        { password: password, app_metadata: { role: role } }
                    )
                    if (updateAuthError) throw updateAuthError
                    authUser.user = existingUser // mock the object structure
                } else {
                    throw new Error('Failed to find existing user after collision')
                }
            } else {
                throw createUserError
            }
        }

        const userId = authUser.user.id

        // 4. Insert into Profiles
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                prn: profileData.prn,
                full_name: profileData.full_name,
                role: role,
                department: profileData.department,
                email: email,
                is_profile_complete: true
            }, { onConflict: 'prn' })

        if (profileError) {
            // Rollback Auth user if profile insert fails and it was a new creation
            await supabaseAdmin.auth.admin.deleteUser(userId)
            throw new Error(`Profile insert failed: ${profileError.message}`)
        }

        // 5. Insert into Students (if applicable)
        if (role === 'student' && studentData) {
            const { error: studentError } = await supabaseAdmin
                .from('students')
                .upsert({
                    prn: profileData.prn,
                    full_name: profileData.full_name,
                    email: email,
                    phone: studentData.phone,
                    roll_no: studentData.roll_no,
                    branch: studentData.branch,
                    year_of_study: studentData.year_of_study,
                    division: studentData.division,
                    gfm_id: null,
                    gfm_name: null
                }, { onConflict: 'prn' })

            if (studentError) {
                throw new Error(`Student insert failed: ${studentError.message}`)
            }
        }

        return new Response(JSON.stringify({ success: true, message: 'User created successfully', data: authUser }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Error creating user:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 400,
        })
    }
})
