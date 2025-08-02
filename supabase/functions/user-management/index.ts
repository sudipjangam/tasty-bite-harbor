import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin permissions
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    const { action, userData } = await req.json()

    console.log('User management action:', action, 'by user:', user.id)

    switch (action) {
      case 'create_user': {
        // Create new user account
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            first_name: userData.first_name,
            last_name: userData.last_name
          }
        })

        if (createError) throw createError

        // Create profile for the new user
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: newUser.user.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            restaurant_id: profile.restaurant_id,
            phone: userData.phone,
            is_active: true
          })

        if (profileError) throw profileError

        return new Response(
          JSON.stringify({ success: true, user: newUser.user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_user': {
        // Update user metadata
        const { data: updatedUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
          userData.id,
          {
            email: userData.email,
            user_metadata: {
              first_name: userData.first_name,
              last_name: userData.last_name
            }
          }
        )

        if (updateError) throw updateError

        // Update profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            phone: userData.phone,
            is_active: userData.is_active
          })
          .eq('id', userData.id)

        if (profileError) throw profileError

        return new Response(
          JSON.stringify({ success: true, user: updatedUser.user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete_user': {
        // Deactivate user instead of deleting
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ is_active: false })
          .eq('id', userData.id)

        if (profileError) throw profileError

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'reset_password': {
        // Send password reset email
        const { error: resetError } = await supabaseClient.auth.admin.generateLink({
          type: 'recovery',
          email: userData.email
        })

        if (resetError) throw resetError

        return new Response(
          JSON.stringify({ success: true, message: 'Password reset email sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('User management error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})