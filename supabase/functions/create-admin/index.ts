// Follow this at: https://supabase.com/docs/guides/functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  role: 'super_admin' | 'admin' | 'viewer'
  is_active?: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verify the requesting user is a super_admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid user')
    }

    // Check if user is super_admin
    const { data: adminData, error: adminError } = await supabaseClient
      .from('admins')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (adminError || !adminData || adminData.role !== 'super_admin' || !adminData.is_active) {
      throw new Error('Unauthorized: Only active super admins can create admin users')
    }

    // Parse request body
    const body: CreateAdminRequest = await req.json()
    const { email, password, first_name, last_name, phone, role, is_active = true } = body

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      throw new Error('Missing required fields: email, password, first_name, last_name, role')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'viewer']
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role. Must be: super_admin, admin, or viewer')
    }

    // Create Supabase Admin client (with service role key)
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if email already exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .single()

    if (existingAdmin) {
      throw new Error('Admin with this email already exists')
    }

    // Create auth user using Admin API
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name,
        last_name,
      },
    })

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError)
      throw new Error(`Failed to create auth user: ${createAuthError.message}`)
    }

    if (!authUser.user) {
      throw new Error('Failed to create auth user: No user returned')
    }

    // Create admin record in admins table
    const { data: newAdmin, error: createAdminError } = await supabaseAdmin
      .from('admins')
      .insert({
        auth_user_id: authUser.user.id,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active,
      })
      .select()
      .single()

    if (createAdminError) {
      // Rollback: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      console.error('Error creating admin record:', createAdminError)
      throw new Error(`Failed to create admin record: ${createAdminError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: newAdmin.id,
          email: newAdmin.email,
          first_name: newAdmin.first_name,
          last_name: newAdmin.last_name,
          role: newAdmin.role,
          is_active: newAdmin.is_active,
        },
        message: 'Admin user created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    )
  } catch (error) {
    console.error('Error in create-admin function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
