import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // tighten for production to your admin origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const systemRoles = ['owner', 'admin', 'manager', 'chef', 'waiter', 'staff', 'viewer'] as const

const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  first_name: z.string().trim().min(1, 'First name required').max(100, 'First name too long'),
  last_name: z.string().trim().max(100, 'Last name too long').default(''),
  role: z.enum(systemRoles).optional().default('staff'),
  role_id: z.string().uuid('Invalid role id').optional(),
  role_name_text: z.string().trim().max(100).optional(),
  restaurant_id: z.string().uuid('Invalid restaurant id').optional(),
})

const updateUserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),
  first_name: z.string().trim().min(1, 'First name required').max(100, 'First name too long').optional(),
  last_name: z.string().trim().max(100, 'Last name too long').optional(),
  role: z.enum(systemRoles).optional(),
  role_id: z.string().uuid('Invalid role id').optional(),
  role_name_text: z.string().trim().max(100).optional(),
  new_password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long').optional()
})

const actionSchema = z.enum(['create_user', 'update_user', 'delete_user', 'reset_password', 'list_users'], {
  errorMap: () => ({ message: 'Invalid action' })
})

// Helper to create error response with proper status
function errorResponse(message: string, status: number, errorId?: string) {
  return new Response(
    JSON.stringify({ error: message, ...(errorId && { errorId }) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper to create success response
function successResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const errorId = crypto.randomUUID();

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[${errorId}] Missing Supabase env vars`)
      return errorResponse('Server misconfiguration', 500, errorId)
    }

    // Admin client with service role (for creating users)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401)
    }

    // Verify the caller by fetching /auth/v1/user with their token
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY
      }
    })

    if (!userResp.ok) {
      return errorResponse('Unauthorized', 401)
    }

    // /auth/v1/user returns user object directly (not wrapped)
    const user = await userResp.json()
    if (!user || !user.id) {
      return errorResponse('Unauthorized', 401)
    }

    // Check if user has admin/owner permissions using secure DB function
    const { data: roleCheckData, error: roleCheckError } = await supabaseAdmin
      .rpc('user_is_admin_or_owner', { user_id: user.id });

    if (roleCheckError) {
      console.error(`[${errorId}] Role check error:`, roleCheckError)
      return errorResponse('Failed to verify permissions', 500, errorId)
    }

    // Interpret RPC return explicitly
    const isAdminOrOwner = (Array.isArray(roleCheckData) ? roleCheckData[0]?.user_is_admin_or_owner : roleCheckData) === true

    if (!isAdminOrOwner) {
      return errorResponse('Insufficient permissions', 403)
    }

    // Fetch profile to get restaurant_id (for fallback)
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('role, role_id, restaurant_id')
      .eq('id', user.id)
      .single()

    if (profileFetchError || !profile) {
      console.error(`[${errorId}] Profile fetch error:`, profileFetchError)
      return errorResponse('Profile not found', 404, errorId)
    }

    const requestBody = await req.json()

    // Validate action
    const validationResult = actionSchema.safeParse(requestBody.action)
    if (!validationResult.success) {
      return errorResponse(`Invalid action: ${validationResult.error.errors[0].message}`, 400)
    }

    const action = validationResult.data
    const actionUserData = requestBody.userData

    console.log(`[${errorId}] User management action: ${action} by user: ${user.id}`)

    switch (action) {
      case 'create_user': {
        // Validate input
        const parseResult = createUserSchema.safeParse(actionUserData)
        if (!parseResult.success) {
          return errorResponse(parseResult.error.errors[0].message, 400)
        }
        const validated = parseResult.data

        // Use provided restaurant_id (for platform admins) or fall back to caller's restaurant
        const targetRestaurantId = validated.restaurant_id || profile.restaurant_id

        if (!targetRestaurantId) {
          return errorResponse('Restaurant ID is required', 400)
        }

        // Create new user account with email confirmed (SDK may vary; adjust if your SDK differs)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: validated.email,
          password: validated.password,
          email_confirm: true,
          user_metadata: {
            first_name: validated.first_name,
            last_name: validated.last_name
          }
        })

        if (createError) {
          const msg = createError?.message ?? JSON.stringify(createError)
          console.error(`[${errorId}] Create user error:`, msg)
          if (msg.toLowerCase().includes('already')) {
            return errorResponse('Email already registered', 409)
          }
          return errorResponse('Failed to create user', 500, errorId)
        }

        const isSystemRole = !validated.role_id

        try {
          // Upsert profile for the new user (handles case where trigger already created row)
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: newUser.user.id,
              first_name: validated.first_name,
              last_name: validated.last_name,
              role: isSystemRole ? (validated.role ?? 'staff') : 'staff',
              role_id: isSystemRole ? null : validated.role_id,
              role_name_text: isSystemRole ? null : (validated.role_name_text ?? null),
              restaurant_id: targetRestaurantId
            }, { onConflict: 'id' })

          if (profileError) {
            // Cleanup: delete the created auth user
            console.error(`[${errorId}] Profile creation failed, cleaning up auth user:`, profileError)
            try {
              await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            } catch (cleanupErr) {
              console.error(`[${errorId}] Cleanup deleteUser failed:`, cleanupErr)
            }
            return errorResponse('Failed to create user profile', 500, errorId)
          }
        } catch (err) {
          // Cleanup on any error
          try {
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
          } catch (cleanupErr) {
            console.error(`[${errorId}] Cleanup deleteUser failed:`, cleanupErr)
          }
          throw err
        }

        // Return sanitized user data (no sensitive fields)
        const safeUser = {
          id: newUser.user.id,
          email: newUser.user.email,
          created_at: newUser.user.created_at
        }

        return successResponse({ success: true, user: safeUser }, 201)
      }

      case 'update_user': {
        const parseResult = updateUserSchema.safeParse(actionUserData)
        if (!parseResult.success) {
          return errorResponse(parseResult.error.errors[0].message, 400)
        }
        const validated = parseResult.data

        // Build admin update payload conditionally
        const adminUpdate: Record<string, any> = {}
        if (validated.email) adminUpdate.email = validated.email
        if (validated.new_password) adminUpdate.password = validated.new_password
        if (validated.first_name || validated.last_name) {
          adminUpdate.user_metadata = {
            ...(validated.first_name ? { first_name: validated.first_name } : {}),
            ...(validated.last_name ? { last_name: validated.last_name } : {}),
          }
        }

        if (Object.keys(adminUpdate).length > 0) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            validated.id,
            adminUpdate
          )
          if (updateError) {
            console.error(`[${errorId}] Update auth user error:`, updateError)
            return errorResponse('Failed to update user', 500, errorId)
          }
        }

        // Prepare profile update
        const profileUpdate: Record<string, any> = {}
        if (validated.first_name) profileUpdate.first_name = validated.first_name
        if (validated.last_name) profileUpdate.last_name = validated.last_name

        const isSystemRole = !validated.role_id
        if (validated.role || validated.role_id || validated.role_name_text) {
          profileUpdate.role = isSystemRole ? (validated.role ?? 'staff') : 'staff'
          profileUpdate.role_id = isSystemRole ? null : (validated.role_id ?? null)
          profileUpdate.role_name_text = isSystemRole ? null : (validated.role_name_text ?? null)
        }

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', validated.id)
          if (profileError) {
            console.error(`[${errorId}] Update profile error:`, profileError)
            return errorResponse('Failed to update profile', 500, errorId)
          }
        }

        return successResponse({ success: true })
      }

      case 'delete_user': {
        const userIdSchema = z.object({ id: z.string().uuid('Invalid user ID') })
        const parseResult = userIdSchema.safeParse(actionUserData)
        if (!parseResult.success) {
          return errorResponse('Invalid user ID', 400)
        }
        const { id: validatedId } = parseResult.data

        // Delete the user from auth (profile cascade or manual delete)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(validatedId)
        if (deleteError) {
          console.error(`[${errorId}] Delete user error:`, deleteError)
          return errorResponse('Failed to delete user', 500, errorId)
        }

        // Attempt profile deletion (may cascade)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', validatedId)

        if (profileError) {
          console.warn(`[${errorId}] Profile deletion warning:`, profileError)
        }

        return successResponse({ success: true })
      }

      case 'reset_password': {
        const emailSchema = z.object({ email: z.string().email('Invalid email format').max(255) })
        const parseResult = emailSchema.safeParse(actionUserData)
        if (!parseResult.success) {
          return errorResponse('Invalid email', 400)
        }
        const { email: validatedEmail } = parseResult.data

        // Generate password reset link
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: validatedEmail
        })

        if (resetError) {
          console.error(`[${errorId}] Password reset error:`, resetError)
          return errorResponse('Failed to send reset email', 500, errorId)
        }

        return successResponse({ success: true, message: 'Password reset email sent' })
      }

      case 'list_users': {
        // Fetch profiles for the restaurant (use provided restaurant_id or caller's)
        const targetRestaurantId = actionUserData?.restaurant_id || profile.restaurant_id

        if (!targetRestaurantId) {
          return errorResponse('Restaurant ID is required', 400)
        }

        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select(`
            *,
            restaurants (name),
            roles:role_id (id, name, is_system, has_full_access)
          `)
          .eq('restaurant_id', targetRestaurantId)
          .order('created_at', { ascending: false });

        if (profileError) {
          console.error(`[${errorId}] List users error:`, profileError)
          return errorResponse('Failed to fetch users', 500, errorId)
        }

        // Fetch emails from auth.users for each profile
        const usersWithEmails = await Promise.all(
          (profiles || []).map(async (p: any) => {
            try {
              const { data: authData } = await supabaseAdmin.auth.admin.getUserById(p.id);
              return {
                ...p,
                email: authData?.user?.email || null
              };
            } catch {
              return { ...p, email: null };
            }
          })
        );

        return successResponse({ success: true, users: usersWithEmails })
      }

      default:
        return errorResponse('Invalid action', 400)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${errorId}] Unexpected error:`, errorMessage)

    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400, errorId)
    }

    return errorResponse('An error occurred processing your request', 500, errorId)
  }
})