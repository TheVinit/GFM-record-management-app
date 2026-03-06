import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    try {
        // 1. Validate Admin Token — done ONCE for the whole batch
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
        if (authError || !user) throw new Error('Invalid token')

        // Admin check: app_metadata, then profiles
        let isAdmin = user.app_metadata?.role === 'admin'
        if (!isAdmin) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            if (profile?.role === 'admin') {
                isAdmin = true
                await supabaseAdmin.auth.admin.updateUserById(user.id, {
                    app_metadata: { role: 'admin' }
                }).catch(() => { }) // non-fatal
            }
        }
        if (!isAdmin) throw new Error('Unauthorized: Admin only')

        // 2. Parse bulk students array
        const { students } = await req.json()
        if (!Array.isArray(students) || students.length === 0) {
            throw new Error('students array is required and must not be empty')
        }

        const results: { prn: string; status: 'created' | 'updated' | 'failed'; error?: string }[] = []

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // 3. Process each student
        for (const s of students) {
            const prn = (s.prn || '').trim()
            const email = (s.email || '').trim().toLowerCase()
            const fullName = (s.fullName || '').trim()

            if (!prn || !email || !fullName) {
                results.push({ prn: prn || '?', status: 'failed', error: 'Missing prn, email, or fullName' })
                continue
            }

            try {
                // Throttle user creation to avoid GoTrue 429 Too Many Requests
                await delay(50);

                // Create or find the auth user
                let userId: string
                let wasCreated = false

                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password: prn, // PRN as default password
                    email_confirm: true,
                    app_metadata: { role: 'student' }
                })

                if (createError) {
                    if (createError.message.includes('already') || createError.message.includes('registered')) {
                        // Look up existing user by email in profiles table (faster than listUsers)
                        const { data: existingProfile } = await supabaseAdmin
                            .from('profiles')
                            .select('id')
                            .eq('email', email)
                            .maybeSingle()

                        if (existingProfile?.id) {
                            userId = existingProfile.id
                        } else {
                            // Last resort: listUsers (slow, avoid if possible)
                            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
                            const match = usersData?.users?.find(u => u.email?.toLowerCase() === email)
                            if (!match) throw new Error(`Cannot find existing user for email ${email}`)
                            userId = match.id
                        }
                        wasCreated = false
                    } else {
                        throw createError
                    }
                } else {
                    userId = newUser.user.id
                    wasCreated = true
                }

                // Upsert profile
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: userId,
                        prn,
                        full_name: fullName,
                        role: 'student',
                        department: s.branch || null,
                        email,
                        is_profile_complete: true
                    }, { onConflict: 'prn' })

                if (profileError) throw new Error(`Profile: ${profileError.message}`)

                // Upsert student record
                const { error: studentError } = await supabaseAdmin
                    .from('students')
                    .upsert({
                        prn,
                        full_name: fullName,
                        email,
                        phone: s.phone || null,
                        parent_mobile: s.parentMobile || null,
                        roll_no: s.rollNo || null,
                        branch: s.branch || 'Computer Engineering',
                        year_of_study: s.yearOfStudy || 'First Year',
                        division: s.division || 'A',
                        gfm_id: null,
                        gfm_name: null
                    }, { onConflict: 'prn' })

                if (studentError) throw new Error(`Student: ${studentError.message}`)

                results.push({ prn, status: wasCreated ? 'created' : 'updated' })
            } catch (err: any) {
                results.push({ prn, status: 'failed', error: err.message })
            }
        }

        const created = results.filter(r => r.status === 'created').length
        const updated = results.filter(r => r.status === 'updated').length
        const failed = results.filter(r => r.status === 'failed')

        return new Response(
            JSON.stringify({ success: true, created, updated, failed: failed.length, failures: failed, results }),
            { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, status: 200 }
        )

    } catch (error: any) {
        console.error('Bulk import error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, status: 400 }
        )
    }
})
