import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  componentIds: z.array(z.string().uuid()),
});

const updateRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional().nullable(),
  componentIds: z.array(z.string().uuid()).optional(),
});

const deleteRoleSchema = z.object({
  id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader =
      req.headers.get('Authorization') ||
      req.headers.get('authorization') ||
      req.headers.get('X-Authorization') ||
      req.headers.get('x-authorization');

    console.log('Auth header received:', authHeader ? 'Yes' : 'No');

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      console.error('Missing or invalid auth header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user is authenticated and has admin/owner role using the Bearer token explicitly
    const token = (authHeader || '').replace(/bearer\s+/i, '').trim();
    console.log('Token extracted:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20) + '...'
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    console.log('User fetch result:', { 
      userId: user?.id, 
      hasError: !!userError,
      errorDetails: userError 
    });
    
    if (userError) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    if (!user) {
      console.error('No user found in token');
      return new Response(
        JSON.stringify({ error: 'No user found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single();

    console.log('Profile fetch result:', { 
      hasProfile: !!profile, 
      restaurantId: profile?.restaurant_id,
      error: profileError?.message 
    });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile', details: profileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (!profile?.restaurant_id) {
      console.error('No restaurant associated with user');
      return new Response(
        JSON.stringify({ error: 'No restaurant associated with user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check if user has admin/owner role
    // First check enum role, then check custom role from roles table
    const { data: roleProfile, error: roleProfileError } = await supabaseClient
      .from('profiles')
      .select('role, role_id')
      .eq('id', user.id)
      .single();

    if (roleProfileError) {
      console.error('Role profile fetch error:', roleProfileError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions', details: roleProfileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    let roleName: string | null = null;
    let isSystemRole = false;

    // Check system role (enum) first
    if (roleProfile?.role) {
      roleName = roleProfile.role;
      isSystemRole = true;
      console.log('User has system role:', { roleName, isSystemRole });
    }

    // Check custom role (from roles table) if role_id exists
    if (roleProfile?.role_id) {
      const { data: roleRow, error: roleRowError } = await supabaseClient
        .from('roles')
        .select('name')
        .eq('id', roleProfile.role_id)
        .single();
      if (roleRowError) {
        console.error('Custom role lookup error:', roleRowError);
      } else if (roleRow?.name) {
        roleName = roleRow.name;
        isSystemRole = false;
        console.log('User has custom role:', { roleName, customRoleId: roleProfile.role_id });
      }
    }

    const hasRole = ['admin', 'owner'].includes((roleName ?? '').toLowerCase());
    console.log('Role check result:', { roleName, isSystemRole, hasRole, userId: user.id });

    if (!hasRole) {
      console.error('User does not have required role');
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - admin or owner role required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Enforce POST and safely parse body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    const contentLength = req.headers.get('content-length') || '';
    const hasBody = !!req.body;
    const bodyUsedBefore = (req as any).bodyUsed ?? false;
    console.log('Request diagnostics:', { method: req.method, contentType, contentLength, hasBody, bodyUsedBefore });

    let payload: any = null;

    // Always read from a cloned request to avoid "body already used" issues
    let rawBody = '';
    try {
      rawBody = await req.clone().text();
      console.log('Raw body info:', { length: rawBody?.length ?? 0, preview: rawBody?.slice(0, 120) });
    } catch (e) {
      console.error('Failed reading request body:', e);
      return new Response(
        JSON.stringify({ error: 'Unable to read request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!rawBody || rawBody.trim().length === 0) {
      console.error('Empty request body received', { contentType, contentLength, hasBody });
      return new Response(
        JSON.stringify({ error: 'Empty request body', details: { contentType, contentLength, hasBody } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('Invalid JSON body:', e, { contentType, rawPreview: rawBody.slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', details: 'Failed to parse JSON' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!payload || typeof payload !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { action, ...data } = payload;

    switch (action) {
      case 'create': {
        const validated = createRoleSchema.parse(data);

        // Create role
        const { data: newRole, error: roleError } = await supabaseClient
          .from('roles')
          .insert({
            name: validated.name,
            description: validated.description,
            restaurant_id: profile.restaurant_id,
            is_deletable: true,
          })
          .select()
          .single();

        if (roleError) throw roleError;

        // Add component permissions
        if (validated.componentIds.length > 0) {
          const roleComponents = validated.componentIds.map(componentId => ({
            role_id: newRole.id,
            component_id: componentId,
          }));

          const { error: compError } = await supabaseClient
            .from('role_components')
            .insert(roleComponents);

          if (compError) throw compError;
        }

        return new Response(
          JSON.stringify({ success: true, role: newRole }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'update': {
        const validated = updateRoleSchema.parse(data);

        // Check if role is deletable (can't modify owner/admin roles)
        const { data: existingRole } = await supabaseClient
          .from('roles')
          .select('is_deletable, name')
          .eq('id', validated.id)
          .eq('restaurant_id', profile.restaurant_id)
          .single();

        if (!existingRole) {
          return new Response(
            JSON.stringify({ error: 'Role not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        // prevent renaming system roles
        if (!existingRole.is_deletable && validated.name && validated.name !== existingRole.name) {
           return new Response(
            JSON.stringify({ error: 'Cannot rename system roles' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }

        // Update role details
        const updateData: any = {};
        if (validated.name) updateData.name = validated.name;
        if (validated.description !== undefined) updateData.description = validated.description;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseClient
            .from('roles')
            .update(updateData)
            .eq('id', validated.id)
            .eq('restaurant_id', profile.restaurant_id);

          if (updateError) throw updateError;
        }

        // Update component permissions
        if (validated.componentIds) {
          // Delete existing permissions
          await supabaseClient
            .from('role_components')
            .delete()
            .eq('role_id', validated.id);

          // Add new permissions
          if (validated.componentIds.length > 0) {
            const roleComponents = validated.componentIds.map(componentId => ({
              role_id: validated.id,
              component_id: componentId,
            }));

            const { error: compError } = await supabaseClient
              .from('role_components')
              .insert(roleComponents);

            if (compError) throw compError;
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'delete': {
        const validated = deleteRoleSchema.parse(data);

        // Check if role is deletable
        const { data: existingRole } = await supabaseClient
          .from('roles')
          .select('is_deletable, name')
          .eq('id', validated.id)
          .eq('restaurant_id', profile.restaurant_id)
          .single();

        if (!existingRole) {
          return new Response(
            JSON.stringify({ error: 'Role not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        if (!existingRole.is_deletable) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete this role' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }

        // Check if any users have this role
        const { data: usersWithRole, error: usersError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('role_id', validated.id)
          .limit(1);

        if (usersError) throw usersError;

        if (usersWithRole && usersWithRole.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete role that is assigned to users' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Delete role (cascade will delete role_components)
        const { error: deleteError } = await supabaseClient
          .from('roles')
          .delete()
          .eq('id', validated.id)
          .eq('restaurant_id', profile.restaurant_id);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('Role management error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation error', details: error.errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});