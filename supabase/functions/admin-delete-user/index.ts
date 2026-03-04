import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
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

        if (authError || !user) throw new Error('Invalid token: ' + (authError?.message || 'unable to verify'))

        // Robust Admin Check
        let isAdmin = user.app_metadata?.role === 'admin'
        if (!isAdmin) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            isAdmin = profile?.role === 'admin'
        }
        if (!isAdmin) throw new Error('Unauthorized: Admin only')

        // 2. Parse Request
        const { prn, email } = await req.json()
        if (!prn && !email) throw new Error('Missing required field: prn or email')

        // 3. Find the Auth user by email or PRN lookup
        let targetUserId: string | null = null

        if (email) {
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
            const found = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
            if (found) targetUserId = found.id
        }

        if (!targetUserId && prn) {
            // Look up user ID from profiles table
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, email')
                .eq('prn', prn)
                .maybeSingle()

            if (profile) {
                targetUserId = profile.id
            }
        }

        // 4. Delete from students table
        const { error: studentError } = await supabaseAdmin
            .from('students')
            .delete()
            .eq('prn', prn)

        if (studentError) console.warn('Student delete warning:', studentError.message)

        // 5. Delete from profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('prn', prn)

        if (profileError) console.warn('Profile delete warning:', profileError.message)

        // 6. Delete Auth user (the critical step that requires service_role)
        if (targetUserId) {
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
            if (authDeleteError) {
                console.error('Auth user delete failed:', authDeleteError.message)
                throw new Error('Failed to delete auth user: ' + authDeleteError.message)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'User fully deleted',
            authUserDeleted: !!targetUserId
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Error deleting user:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 400,
        })
    }
})
